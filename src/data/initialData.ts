import { ExistingSeat, TableConfig, ReservationRecord } from '../types';

export const TABLES: TableConfig[] = [
  { id: 1, name: 'โต๊ะคณะอาจารย์ 1', zone: 'โซนคณะอาจารย์', capacity: 8, description: 'โต๊ะคณะอาจารย์และผู้บริหาร คณะพยาบาลศาสตร์ มข. (8 ที่นั่ง)' },
  { id: 2, name: 'โต๊ะคณะอาจารย์ 2', zone: 'โซนคณะอาจารย์', capacity: 8, description: 'โต๊ะคณะอาจารย์และผู้บริหาร คณะพยาบาลศาสตร์ มข. (8 ที่นั่ง)' },
  { id: 3, name: 'โต๊ะบัณฑิต 3', zone: 'โซนบัณฑิต', capacity: 8, description: 'โต๊ะมหาบัณฑิต ป.โท คณะพยาบาลศาสตร์ มข. (8 ที่นั่ง)' },
  { id: 4, name: 'โต๊ะบัณฑิต 4', zone: 'โซนบัณฑิต', capacity: 8, description: 'โต๊ะมหาบัณฑิต ป.โท คณะพยาบาลศาสตร์ มข. (8 ที่นั่ง)' },
  { id: 5, name: 'โต๊ะบัณฑิต 5', zone: 'โซนบัณฑิต', capacity: 8, description: 'โต๊ะมหาบัณฑิต ป.โท คณะพยาบาลศาสตร์ มข. (8 ที่นั่ง)' },
  { id: 6, name: 'โต๊ะบัณฑิต 6', zone: 'โซนบัณฑิต', capacity: 8, description: 'โต๊ะมหาบัณฑิต ป.โท คณะพยาบาลศาสตร์ มข. (8 ที่นั่ง)' },
  { id: 7, name: 'โต๊ะบัณฑิต 7', zone: 'โซนบัณฑิต', capacity: 8, description: 'โต๊ะมหาบัณฑิต ป.โท คณะพยาบาลศาสตร์ มข. (8 ที่นั่ง)' },
  { id: 8, name: 'โต๊ะบัณฑิตและผู้ร่วมงาน 8', zone: 'โซนผู้ร่วมงานและครอบครัว', capacity: 8, description: 'โต๊ะบัณฑิต ครอบครัว และผู้ร่วมงาน (8 ที่นั่ง)' },
  { id: 9, name: 'โต๊ะบัณฑิตและผู้ร่วมงาน 9', zone: 'โซนผู้ร่วมงานและครอบครัว', capacity: 8, description: 'โต๊ะบัณฑิต ครอบครัว และผู้ร่วมงาน (8 ที่นั่ง)' },
  { id: 10, name: 'โต๊ะบัณฑิตและผู้ร่วมงาน 10', zone: 'โซนผู้ร่วมงานและครอบครัว', capacity: 8, description: 'โต๊ะบัณฑิต ครอบครัว และผู้ร่วมงาน (8 ที่นั่ง)' },
  { id: 11, name: 'โต๊ะบัณฑิตและผู้ร่วมงาน 11', zone: 'โซนผู้ร่วมงานและครอบครัว', capacity: 8, description: 'โต๊ะบัณฑิต ครอบครัว และผู้ร่วมงาน (8 ที่นั่ง)' },
  { id: 12, name: 'โต๊ะบัณฑิตและผู้ร่วมงาน 12', zone: 'โซนผู้ร่วมงานและครอบครัว', capacity: 8, description: 'โต๊ะบัณฑิต ครอบครัว และผู้ร่วมงาน (8 ที่นั่ง)' },
  { id: 13, name: 'โต๊ะบัณฑิตและผู้ร่วมงาน 13', zone: 'โซนผู้ร่วมงานและครอบครัว', capacity: 8, description: 'โต๊ะบัณฑิต ครอบครัว และผู้ร่วมงาน (8 ที่นั่ง)' },
  { id: 14, name: 'โต๊ะบัณฑิตและผู้ร่วมงาน 14', zone: 'โซนผู้ร่วมงานและครอบครัว', capacity: 8, description: 'โต๊ะบัณฑิต ครอบครัว และผู้ร่วมงาน (8 ที่นั่ง)' },
  { id: 15, name: 'โต๊ะบัณฑิตและผู้ร่วมงาน 15', zone: 'โซนผู้ร่วมงานและครอบครัว', capacity: 8, description: 'โต๊ะบัณฑิต ครอบครัว และผู้ร่วมงาน (8 ที่นั่ง)' }
];

export const INITIAL_PRESET_SEATS: ExistingSeat[] = [];

// Clear any previous mock reservations
try {
  if (typeof window !== 'undefined' && !localStorage.getItem('grad69_cleared_v3')) {
    localStorage.removeItem('grad69_reservations_v1');
    localStorage.removeItem('grad69_extra_seats_v1');
    localStorage.setItem('grad69_cleared_v3', 'true');
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
