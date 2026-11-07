import type { ExistingSeat, ReservationRecord } from './types';

const defaultBase = 'https://xvmnouioezqxcomughci.supabase.co';
const defaultAnon = 'sb_publishable_bNJhssq-2DVA4h1R56wcIQ_lkB66IvT';

const base = import.meta.env.VITE_SUPABASE_URL || defaultBase;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultAnon;

async function request<T>(name: string, payload?: unknown): Promise<T> {
  if (!base || !anon) {
    throw new Error('ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL หรือ VITE_SUPABASE_ANON_KEY ในระบบ');
  }

  // In local development, use Vite dev proxy to preserve ALLOWED_ORIGIN check
  const endpoint = import.meta.env.DEV
    ? `/supabase-functions/${name}`
    : `${base}/functions/v1/${name}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anon, Authorization: `Bearer ${anon}` },
    body: JSON.stringify(payload ?? {}),
    cache: 'no-store'
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Server error ${response.status}`);
  return result as T;
}

export async function fetchPublicSeats(): Promise<ExistingSeat[]> {
  const data = await request<{ seats: ExistingSeat[] }>('public-seats');
  if (!Array.isArray(data.seats)) throw new Error('Invalid seat data');
  return data.seats;
}

export async function createReservation(record: ReservationRecord): Promise<void> {
  const { id, mainBooker, phone, email, category, academicYear, guestCount, guests, assignments, totalAmount, slipFileName, slipTimestamp } = record;
  await request('create-reservation', { id, mainBooker, phone, email, category, academicYear, guestCount, guests, assignments, totalAmount, slipFileName, slipTimestamp });
}

export async function fetchAdminReservations(): Promise<ReservationRecord[]> {
  const { supabase } = await import('./supabase');

  const { data, error } = await supabase.functions.invoke(
    'admin-api',
    { body: { action: 'list-reservations' } }
  );

  if (error) throw error;
  if (!Array.isArray(data?.reservations)) {
    throw new Error('ไม่สามารถโหลดรายการจองได้');
  }

  return data.reservations.map((row: any) => ({
    id: row.id,
    mainBooker: row.main_booker,
    phone: row.phone,
    email: row.email,
    category: row.category,
    academicYear: row.academic_year,
    guestCount: row.guest_count,
    guests: row.guests,
    assignments: row.assignments,
    totalAmount: row.total_amount,
    slipFileName: row.slip_file_name,
    slipUrl: row.slip_url,
    slipTimestamp: row.slip_timestamp,
    status: row.status,
    rejectionReason: row.rejection_reason,
    notes: row.notes,
    createdAt: row.created_at
  }));
}

/**
 * Server-side atomic deletion of a reservation with cascade to seats and audit log.
 * Authenticates using Supabase Auth token if present.
 */
export async function deleteReservationFromServer(reservationId: string): Promise<{ success: boolean; freedSeats: number; message: string }> {
  const { supabase } = await import('./supabase');
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const { data, error } = await supabase.functions.invoke('admin-api', {
    body: { action: 'delete-reservation', reservationId },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });

  if (error || !data?.success) {
    throw new Error(data?.error || error?.message || 'เกิดข้อผิดพลาดในการลบการจองจากเซิร์ฟเวอร์');
  }

  return data;
}

/**
 * Upload real payment slips or documents to Supabase Storage (Private 'payment-slips' bucket)
 */
export async function uploadPaymentDocument(file: File, reservationId: string): Promise<{ path: string; fileName: string }> {
  const { supabase } = await import('./supabase');
  const cleanName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filePath = `${reservationId}/${cleanName}`;

  const { data, error } = await supabase.storage
    .from('payment-slips')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.error('Storage upload error:', error);
    throw new Error(`ไม่สามารถอัปโหลดไฟล์ไปยัง Supabase Storage ได้ (${error.message})`);
  }

  return {
    path: data.path,
    fileName: file.name
  };
}

/**
 * Generates a signed URL for private files in Supabase Storage.
 * Supports PDF, PNG, JPG.
 */
export async function getDocumentSignedUrl(pathOrUrl: string): Promise<string> {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('data:') || pathOrUrl.startsWith('blob:')) {
    return pathOrUrl;
  }

  const { supabase } = await import('./supabase');
  let cleanPath = pathOrUrl;
  if (pathOrUrl.includes('/payment-slips/')) {
    cleanPath = pathOrUrl.split('/payment-slips/')[1];
  }

  const { data, error } = await supabase.storage
    .from('payment-slips')
    .createSignedUrl(cleanPath, 3600);

  if (error || !data?.signedUrl) {
    // Fallback: try requesting through admin-api
    const { data: adminData } = await supabase.functions.invoke('admin-api', {
      body: { action: 'get-signed-url', path: cleanPath }
    });
    if (adminData?.signedUrl) return adminData.signedUrl;
    throw new Error(error?.message || 'ไม่พบไฟล์ในพื้นที่จัดเก็บ Storage');
  }

  return data.signedUrl;
}

/**
 * Dispatches ticket email or 24h reminder via Resend Edge Function
 */
export async function dispatchTicketEmail(
  reservationId: string,
  action: 'send-ticket-pass' | 'send-reminder-24h' = 'send-ticket-pass'
): Promise<{ success: boolean; status: string; errorMessage?: string; subject?: string }> {
  const { supabase } = await import('./supabase');
  const { data, error } = await supabase.functions.invoke('send-ticket-email', {
    body: { action, reservationId }
  });

  if (error) {
    throw new Error(error.message || 'เกิดข้อผิดพลาดในการเรียกฟังก์ชันส่งอีเมล');
  }

  return data;
}

