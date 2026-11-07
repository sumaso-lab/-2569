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
    createdAt: row.created_at
  }));
}
