export type AttendeeCategory = 'graduate' | 'faculty' | 'agn5' | 'guest';

export interface GuestInfo {
  id: string;
  name: string;
  category: AttendeeCategory;
  phone?: string;
  email?: string;
  ticketCode?: string;
  table?: number;
  seat?: number;
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
  phone?: string;
  email?: string;
  reservationId?: string;
  notes?: string;
}

export interface TableConfig {
  id: number;
  name: string;
  zone: string;
  capacity: number;
  description: string;
}

export interface AttachedDocument {
  id: string;
  name: string;
  type: 'slip' | 'id_card' | 'receipt' | 'voucher' | 'other';
  url: string;
  uploadedAt: string;
  size?: string;
  status?: 'verified' | 'pending' | 'rejected';
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
  attachedDocuments?: AttachedDocument[];
  status: 'verified' | 'pending' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  notes?: string;
  emailSentImmediately?: boolean;
  emailSentAt?: string;
  reminderScheduled24h?: boolean;
  reminderScheduledFor?: string;
  reminderSent24h?: boolean;
}

