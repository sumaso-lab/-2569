import type { ExistingSeat, ReservationRecord } from './types';

const base = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!base || !anon) throw new Error('Missing Supabase environment variables');

async function request<T>(name: string, payload?: unknown): Promise<T> {
  const response = await fetch(`${base}/functions/v1/${name}`, {
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
