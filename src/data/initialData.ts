import { ExistingSeat, TableConfig, ReservationRecord } from '../types';

export const TABLES: TableConfig[] = [
  { id: 1, name: 'โต๊ะอาจารย์ 1', zone: 'โซนอาจารย์', capacity: 8, description: 'โต๊ะคณาจารย์และผู้บริหาร (8 ที่นั่ง · ฝั่งซ้ายหน้าเวที)' },
  { id: 2, name: 'โต๊ะอาจารย์ 2', zone: 'โซนอาจารย์', capacity: 8, description: 'โต๊ะคณาจารย์และผู้บริหาร (8 ที่นั่ง · ฝั่งขวาหน้าเวที)' },
  { id: 3, name: 'โต๊ะบัณฑิต 3', zone: 'โซนบัณฑิต', capacity: 8, description: 'โต๊ะมหาบัณฑิต ป.โท คณะพยาบาลศาสตร์ มข. (8 ที่นั่ง · แถวที่ 2 ฝั่งซ้ายริม)' },
  { id: 4, name: 'โต๊ะบัณฑิต 4', zone: 'โซนบัณฑิต', capacity: 8, description: 'โต๊ะมหาบัณฑิต ป.โท คณะพยาบาลศาสตร์ มข. (8 ที่นั่ง · แถวที่ 2 ฝั่งซ้ายติดทางเดิน)' },
  { id: 5, name: 'โต๊ะบัณฑิต 5', zone: 'โซนบัณฑิต', capacity: 8, description: 'โต๊ะมหาบัณฑิต ป.โท คณะพยาบาลศาสตร์ มข. (8 ที่นั่ง · แถวที่ 2 ฝั่งขวาติดทางเดิน)' },
  { id: 6, name: 'โต๊ะบัณฑิต 6', zone: 'โซนบัณฑิต', capacity: 8, description: 'โต๊ะมหาบัณฑิต ป.โท คณะพยาบาลศาสตร์ มข. (8 ที่นั่ง · แถวที่ 2 ฝั่งขวาริม)' },
  { id: 7, name: 'โต๊ะบัณฑิต 7', zone: 'โซนบัณฑิต', capacity: 8, description: 'โต๊ะมหาบัณฑิต ป.โท คณะพยาบาลศาสตร์ มข. (8 ที่นั่ง · แถวที่ 3 ฝั่งซ้ายริม)' },
  { id: 8, name: 'โต๊ะบัณฑิต 8', zone: 'โซนบัณฑิต', capacity: 8, description: 'โต๊ะมหาบัณฑิต ป.โท คณะพยาบาลศาสตร์ มข. (8 ที่นั่ง · แถวที่ 3 ฝั่งซ้ายติดทางเดิน)' },
  { id: 9, name: 'โต๊ะบัณฑิต 9', zone: 'โซนบัณฑิต', capacity: 8, description: 'โต๊ะมหาบัณฑิต ป.โท คณะพยาบาลศาสตร์ มข. (8 ที่นั่ง · แถวที่ 3 ฝั่งขวาติดทางเดิน)' },
  { id: 10, name: 'โต๊ะ AGN5 10', zone: 'โซน AGN5', capacity: 8, description: 'โต๊ะกลุ่ม AGN5 (8 ที่นั่ง · แถวที่ 3 ฝั่งขวาริม)' },
  { id: 11, name: 'โต๊ะ AGN5 11', zone: 'โซน AGN5', capacity: 8, description: 'โต๊ะกลุ่ม AGN5 (8 ที่นั่ง · แถวที่ 4 ฝั่งซ้ายใกล้ทางเข้า)' },
  { id: 12, name: 'โต๊ะ AGN5 12', zone: 'โซน AGN5', capacity: 8, description: 'โต๊ะกลุ่ม AGN5 (8 ที่นั่ง · แถวที่ 4 ฝั่งขวาใกล้ทางเข้า)' }
];

export const INITIAL_PRESET_SEATS: ExistingSeat[] = [];

// Clear any previous mock reservations to apply the new 12-table layout
try {
  if (typeof window !== 'undefined' && !localStorage.getItem('grad69_cleared_v4_12tables')) {
    localStorage.removeItem('grad69_reservations_v1');
    localStorage.removeItem('grad69_extra_seats_v1');
    localStorage.setItem('grad69_cleared_v4_12tables', 'true');
  }
} catch {}

const STORAGE_KEY_RESERVATIONS = 'grad69_reservations_v1';
const STORAGE_KEY_EXTRA_SEATS = 'grad69_extra_seats_v1';

export function getStoredReservations(): ReservationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RESERVATIONS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveReservationToStorage(record: ReservationRecord) {
  try {
    const current = getStoredReservations();
    const updated = [record, ...current];
    localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save reservation:', e);
  }
}

export function getStoredExtraSeats(): ExistingSeat[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EXTRA_SEATS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveExtraSeatToStorage(seat: ExistingSeat) {
  try {
    const current = getStoredExtraSeats();
    const filtered = current.filter(s => !(s.table === seat.table && s.seat === seat.seat));
    filtered.push(seat);
    localStorage.setItem(STORAGE_KEY_EXTRA_SEATS, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to save extra seat:', e);
  }
}

export function toggleCheckInStatus(table: number, seat: number): boolean {
  try {
    const extraSeats = getStoredExtraSeats();
    const extraIdx = extraSeats.findIndex(s => s.table === table && s.seat === seat);
    if (extraIdx >= 0) {
      extraSeats[extraIdx].checkedIn = !extraSeats[extraIdx].checkedIn;
      localStorage.setItem(STORAGE_KEY_EXTRA_SEATS, JSON.stringify(extraSeats));
      return extraSeats[extraIdx].checkedIn ?? false;
    }
    return false;
  } catch {
    return false;
  }
}

export function updateReservationStatusInStorage(
  reservationId: string,
  status: 'verified' | 'pending' | 'rejected'
): ReservationRecord | null {
  try {
    const reservations = getStoredReservations();
    const idx = reservations.findIndex(r => r.id === reservationId);
    if (idx >= 0) {
      reservations[idx].status = status;
      localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(reservations));
      return reservations[idx];
    }
    return null;
  } catch (e) {
    console.error('Failed to update reservation status:', e);
    return null;
  }
}

export function deleteReservationFromStorage(reservationId: string): boolean {
  try {
    const reservations = getStoredReservations();
    const target = reservations.find(r => r.id === reservationId);
    const filtered = reservations.filter(r => r.id !== reservationId);
    localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(filtered));

    // Also remove assigned seats
    if (target && target.assignments) {
      const extraSeats = getStoredExtraSeats();
      const targetSeats = Object.values(target.assignments);
      const remainingSeats = extraSeats.filter(
        s => !targetSeats.some(ts => ts.table === s.table && ts.seat === s.seat)
      );
      localStorage.setItem(STORAGE_KEY_EXTRA_SEATS, JSON.stringify(remainingSeats));
    }
    return true;
  } catch (e) {
    console.error('Failed to delete reservation:', e);
    return false;
  }
}

export function deleteSeatFromStorage(table: number, seat: number): boolean {
  try {
    const current = getStoredExtraSeats();
    const filtered = current.filter(s => !(s.table === table && s.seat === seat));
    localStorage.setItem(STORAGE_KEY_EXTRA_SEATS, JSON.stringify(filtered));
    return true;
  } catch (e) {
    console.error('Failed to delete seat:', e);
    return false;
  }
}

export function updateSeatInStorage(
  table: number,
  seat: number,
  update: Partial<ExistingSeat>
): boolean {
  try {
    const current = getStoredExtraSeats();
    const idx = current.findIndex(s => s.table === table && s.seat === seat);
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...update };
      localStorage.setItem(STORAGE_KEY_EXTRA_SEATS, JSON.stringify(current));
      return true;
    }
    return false;
  } catch (e) {
    console.error('Failed to update seat:', e);
    return false;
  }
}

export function updateFullReservationInStorage(record: ReservationRecord): boolean {
  try {
    const reservations = getStoredReservations();
    const idx = reservations.findIndex(r => r.id === record.id);
    if (idx >= 0) {
      reservations[idx] = { ...record };
    } else {
      reservations.unshift(record);
    }
    localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(reservations));
    return true;
  } catch (e) {
    console.error('Failed to update full reservation:', e);
    return false;
  }
}

export function reassignSeatInStorage(
  oldTable: number,
  oldSeat: number,
  newTable: number,
  newSeat: number,
  data: Partial<ExistingSeat>
): boolean {
  try {
    const current = getStoredExtraSeats();
    const filtered = current.filter(s => !(s.table === oldTable && s.seat === oldSeat));
    const newEntry: ExistingSeat = {
      table: newTable,
      seat: newSeat,
      guestName: data.guestName || 'ผู้เข้าร่วมงาน',
      category: data.category || 'guest',
      ticketCode: data.ticketCode || `GRAD69-T${String(newTable).padStart(2, '0')}S${String(newSeat).padStart(2, '0')}`,
      checkedIn: data.checkedIn || false,
      phone: data.phone,
      email: data.email,
      notes: data.notes
    };
    filtered.push(newEntry);
    localStorage.setItem(STORAGE_KEY_EXTRA_SEATS, JSON.stringify(filtered));
    return true;
  } catch (e) {
    console.error('Failed to reassign seat:', e);
    return false;
  }
}

export function swapSeatsInStorage(

  tableA: number,
  seatA: number,
  tableB: number,
  seatB: number
): boolean {
  try {
    const current = getStoredExtraSeats();
    const idxA = current.findIndex(s => s.table === tableA && s.seat === seatA);
    const idxB = current.findIndex(s => s.table === tableB && s.seat === seatB);

    if (idxA >= 0 && idxB >= 0) {
      // Both seats are occupied, swap positions
      current[idxA].table = tableB;
      current[idxA].seat = seatB;
      current[idxA].ticketCode = `GRAD69-T${String(tableB).padStart(2, '0')}S${String(seatB).padStart(2, '0')}`;

      current[idxB].table = tableA;
      current[idxB].seat = seatA;
      current[idxB].ticketCode = `GRAD69-T${String(tableA).padStart(2, '0')}S${String(seatA).padStart(2, '0')}`;
    } else if (idxA >= 0 && idxB === -1) {
      // A moves to vacant B
      current[idxA].table = tableB;
      current[idxA].seat = seatB;
      current[idxA].ticketCode = `GRAD69-T${String(tableB).padStart(2, '0')}S${String(seatB).padStart(2, '0')}`;
    } else if (idxB >= 0 && idxA === -1) {
      // B moves to vacant A
      current[idxB].table = tableA;
      current[idxB].seat = seatA;
      current[idxB].ticketCode = `GRAD69-T${String(tableA).padStart(2, '0')}S${String(seatA).padStart(2, '0')}`;
    }

    localStorage.setItem(STORAGE_KEY_EXTRA_SEATS, JSON.stringify(current));
    return true;
  } catch (e) {
    console.error('Failed to swap seats:', e);
    return false;
  }
}


const STORAGE_KEY_ADMIN_PASSCODE = 'grad69_admin_passcode_v1';
export const DEFAULT_ADMIN_PASSCODE = '2569';

export function getAdminPasscode(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_ADMIN_PASSCODE) || DEFAULT_ADMIN_PASSCODE;
  } catch {
    return DEFAULT_ADMIN_PASSCODE;
  }
}

export function setAdminPasscode(code: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ADMIN_PASSCODE, code);
  } catch (e) {
    console.error('Failed to save admin passcode:', e);
  }
}

