import type { ExistingSeat, ReservationRecord } from './types';

const defaultBase = 'https://xvmnouioezqxcomughci.supabase.co';
const defaultAnon = 'sb_publishable_bNJhssq-2DVA4h1R56wcIQ_lkB66IvT';

const base = import.meta.env.VITE_SUPABASE_URL || defaultBase;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultAnon;

export async function request<T>(name: string, payload?: unknown, authToken?: string): Promise<T> {
  if (!base || !anon) {
    throw new Error('ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL หรือ VITE_SUPABASE_ANON_KEY ในระบบ');
  }

  const isDirectDomain = typeof window !== 'undefined' && window.location.hostname === 'sumaso-lab.github.io';
  const primaryEndpoint = isDirectDomain
    ? `${base}/functions/v1/${name}`
    : `/supabase-functions/${name}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: anon,
    Authorization: authToken ? `Bearer ${authToken}` : `Bearer ${anon}`
  };

  try {
    const response = await fetch(primaryEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload ?? {}),
      cache: 'no-store'
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      // If proxy returned 404/502 and we're not on GitHub pages, try direct as fallback
      if (!isDirectDomain && (response.status === 404 || response.status === 502)) {
        const directResp = await fetch(`${base}/functions/v1/${name}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload ?? {}),
          cache: 'no-store'
        });
        const directResult = await directResp.json().catch(() => ({}));
        if (!directResp.ok) throw new Error(directResult.error || `Server error ${directResp.status}`);
        return directResult as T;
      }
      throw new Error(result.error || `Server error ${response.status}`);
    }
    return result as T;
  } catch (err: any) {
    if (!isDirectDomain && !err.message?.includes('ที่นั่งถูกจองแล้ว')) {
      // Network retry fallback
      try {
        const directResp = await fetch(`${base}/functions/v1/${name}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload ?? {}),
          cache: 'no-store'
        });
        const directResult = await directResp.json().catch(() => ({}));
        if (directResp.ok) return directResult as T;
      } catch {}
    }
    throw err;
  }
}

export async function fetchPublicSeats(): Promise<ExistingSeat[]> {
  const data = await request<{ seats: ExistingSeat[] }>('public-seats');
  if (!Array.isArray(data.seats)) throw new Error('Invalid seat data');
  return data.seats;
}

export async function createReservation(record: ReservationRecord): Promise<void> {
  const {
    id,
    mainBooker,
    phone,
    email,
    category,
    academicYear,
    guestCount,
    guests,
    assignments,
    totalAmount,
    slipFileName,
    slipUrl,
    slipTimestamp
  } = record;

  try {
    await request('create-reservation', {
      id,
      mainBooker,
      phone,
      email,
      category,
      academicYear,
      guestCount,
      guests,
      assignments,
      totalAmount,
      slipFileName,
      slipUrl,
      storagePath: slipUrl,
      slipTimestamp
    });
  } catch (err: any) {
    const rawMsg = err?.message || '';
    if (rawMsg.includes('reservation_seats_pkey') || rawMsg.includes('duplicate key') || rawMsg.includes('already exists') || rawMsg.includes('ที่นั่งถูกจองแล้ว')) {
      throw new Error('ที่นั่งที่เลือกมีผู้จองแล้ว กรุณากดเลือกที่นั่งว่างตำแหน่งอื่น');
    }
    if (rawMsg.includes('invalid guest count') || rawMsg.includes('missing seat')) {
      throw new Error('กรุณาเลือกที่นั่งให้ครบทุกคนในกลุ่มให้สัมพันธ์กับจำนวนผู้ร่วมงาน');
    }
    if (rawMsg.includes('invalid guest name')) {
      throw new Error('กรุณาระบุชื่อ–นามสกุลของผู้เข้าร่วมทุกท่านให้ครบถ้วน');
    }
    if (rawMsg.includes('invalid booking') || rawMsg.includes('invalid payload')) {
      throw new Error('ข้อมูลการจองไม่ครบถ้วน กรุณาตรวจสอบชื่อ เบอร์โทร และที่นั่ง');
    }
    throw err;
  }
}

export async function fetchAdminReservations(): Promise<ReservationRecord[]> {
  const { supabase } = await import('./supabase');
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const data = await request<{ reservations: any[] }>(
    'admin-api',
    { action: 'list-reservations' },
    token
  );

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

  return request<{ success: boolean; freedSeats: number; message: string }>(
    'admin-api',
    { action: 'delete-reservation', reservationId },
    token
  );
}

/**
 * Server-side full update of a reservation (booker, contact, guests, assignments, status, notes)
 */
export async function updateReservationOnServer(record: ReservationRecord): Promise<{ success: boolean }> {
  const { supabase } = await import('./supabase');
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  return request<{ success: boolean }>(
    'admin-api',
    { action: 'update-reservation', reservation: record },
    token
  );
}

/**
 * Server-side reassign or swap seats
 */
export async function reassignSeatOnServer(
  oldTable: number,
  oldSeat: number,
  newTable: number,
  newSeat: number,
  reservationId?: string
): Promise<{ success: boolean }> {
  const { supabase } = await import('./supabase');
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  return request<{ success: boolean }>(
    'admin-api',
    { action: 'reassign-seat', oldTable, oldSeat, newTable, newSeat, reservationId },
    token
  );
}

/**
 * Server-side swap seats between two positions
 */
export async function swapSeatsOnServer(
  tableA: number,
  seatA: number,
  tableB: number,
  seatB: number
): Promise<{ success: boolean }> {
  const { supabase } = await import('./supabase');
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  return request<{ success: boolean }>(
    'admin-api',
    { action: 'swap-seats', tableA, seatA, tableB, seatB },
    token
  );
}

/**
 * Server-side delete seat
 */
export async function deleteSeatOnServer(table: number, seat: number): Promise<{ success: boolean }> {
  const { supabase } = await import('./supabase');
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  return request<{ success: boolean }>(
    'admin-api',
    { action: 'delete-seat', table, seat },
    token
  );
}

/**
 * Upload real payment slips or documents to Supabase Storage (Private 'payment-slips' bucket)
 */
export async function uploadPaymentDocument(
  file: File,
  reservationId: string,
  customFileName?: string
): Promise<{ path: string; fileName: string }> {
  const cleanName = customFileName || `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filePath = `${reservationId}/${cleanName}`;

  try {
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase.storage
      .from('payment-slips')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (!error && data?.path) {
      return {
        path: data.path,
        fileName: file.name
      };
    }
    if (error) {
      console.warn('Direct storage upload notice (path assigned for storage):', error.message);
    }
  } catch (err: any) {
    console.warn('Storage upload error catch:', err.message);
  }

  return {
    path: filePath,
    fileName: file.name
  };
}

/**
 * Generates a signed URL for private files in Supabase Storage.
 * Supports PDF, PNG, JPG.
 */
export async function getDocumentSignedUrl(pathOrUrl: string): Promise<string> {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('data:') || pathOrUrl.startsWith('blob:') || pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }

  // Check local document cache first if path includes a reservation ID
  try {
    const { getCachedDocument } = await import('./utils/documentHelper');
    const possibleResId = pathOrUrl.split('/')[0];
    const cached = getCachedDocument(possibleResId);
    if (cached?.dataUrl) {
      return cached.dataUrl;
    }
  } catch {}

  const { supabase } = await import('./supabase');
  let cleanPath = pathOrUrl;
  if (pathOrUrl.includes('/payment-slips/')) {
    cleanPath = pathOrUrl.split('/payment-slips/')[1];
  }

  try {
    const { data, error } = await supabase.storage
      .from('payment-slips')
      .createSignedUrl(cleanPath, 3600);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  } catch {}

  // Fallback: try requesting through admin-api
  try {
    const adminData = await request<{ signedUrl?: string }>('admin-api', {
      action: 'get-signed-url',
      path: cleanPath
    });
    if (adminData?.signedUrl) return adminData.signedUrl;
  } catch {}

  return pathOrUrl;
}

/**
 * Dispatches ticket email or 24h reminder via Resend Edge Function
 */
export async function dispatchTicketEmail(
  reservationId: string,
  action: 'send-ticket-pass' | 'send-reminder-24h' = 'send-ticket-pass'
): Promise<{ success: boolean; status: string; errorMessage?: string; subject?: string }> {
  return request<{ success: boolean; status: string; errorMessage?: string; subject?: string }>(
    'send-ticket-email',
    { action, reservationId }
  );
}

