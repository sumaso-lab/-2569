export type AttendeeCategory = 'graduate' | 'faculty' | 'guest';

export interface GuestInfo {
  id: string;
  name: string;
  category: AttendeeCategory;
  phone?: string;
  email?: string;
  ticketCode?: string;
}

export interface SeatAssignment {
  table: number;
  seat: number;
}

export interface ExistingSeat {
  table: number;
  seat: number;
  guestName: string;
  category: AttendeeCategory;
  ticketCode?: string;
  checkedIn?: boolean;
}

export interface TableConfig {
  id: number;
  name: string;
  zone: string;
  capacity: number;
  description: string;
}

export interface ReservationRecord {
  id: string;
  mainBooker: string;
  phone: string;
  email: string;
  category: AttendeeCategory;
  academicYear: string;
  guestCount: number;
  guests: GuestInfo[];
  assignments: Record<number, SeatAssignment>; // index -> {table, seat}
  totalAmount: number;
  slipFileName?: string;
  slipUrl?: string;
  slipTimestamp: string;
  status: 'verified' | 'pending';
  createdAt: string;
}
