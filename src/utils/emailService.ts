import { ReservationRecord } from '../types';

export interface EmailDispatchRecord {
  id: string;
  reservationId: string;
  recipientEmail: string;
  recipientName: string;
  type: 'immediate_approval' | 'reminder_24h' | 'manual_resend';
  subject: string;
  table: number;
  seat: number;
  ticketCodes: string[];
  sentAt: string;
  scheduledFor?: string;
  status: 'sent' | 'scheduled' | 'delivered';
  contentSnippet: string;
}

const STORAGE_KEY_DISPATCHES = 'grad69_email_dispatches';
const STORAGE_KEY_REMINDERS = 'grad69_scheduled_24h_reminders';

export const RACHAWADEE_MAPS_URL =
  'https://www.google.com/maps/place/Rachawadee+Khonkaen+Airport+Hotel/@16.460217,102.7838134,17z/data=!3m1!4b1!4m9!3m8!1s0x312261cbd71eca59:0xc4e42f5f77ff1dbe!5m2!4m1!1i2!8m2!3d16.460217!4d102.7863883!16s%2Fg%2F1tkb2l2h?entry=ttu';

export const getEmailDispatchLogs = (): EmailDispatchRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISPATCHES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse email dispatch logs:', e);
    return [];
  }
};

export const saveEmailDispatchLog = (log: EmailDispatchRecord) => {
  try {
    const existing = getEmailDispatchLogs();
    const updated = [log, ...existing].slice(0, 100);
    localStorage.setItem(STORAGE_KEY_DISPATCHES, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save email dispatch log:', e);
  }
};

/**
 * 1. ส่งเมลให้ทันทีหลังจากอนุมัติบัตร
 */
export const sendImmediateApprovalEmail = (reservation: ReservationRecord): EmailDispatchRecord => {
  const timestamp = new Date().toLocaleString('th-TH');
  const ticketCodes = reservation.guests.map(g => g.ticketCode || `GRAD69-${reservation.id}`).filter(Boolean);
  const seatsList = Object.values(reservation.assignments || {})
    .map(a => `โต๊ะ ${a.table} เก้าอี้ ${a.seat}`)
    .join(', ');

  const subject = `[บัตรเข้างานอย่างเป็นทางการ] ยินดีมหาบัณฑิตพยาบาล มข. ๒๕๖๙ — ${reservation.mainBooker} (${seatsList || 'โต๊ะจัดเลี้ยง'})`;

  const log: EmailDispatchRecord = {
    id: 'DISP-' + Math.floor(100000 + Math.random() * 900000),
    reservationId: reservation.id,
    recipientEmail: reservation.email || 'graduate@nu.kku.ac.th',
    recipientName: reservation.mainBooker,
    type: 'immediate_approval',
    subject,
    table: Object.values(reservation.assignments || {})[0]?.table || 1,
    seat: Object.values(reservation.assignments || {})[0]?.seat || 1,
    ticketCodes,
    sentAt: timestamp,
    status: 'delivered',
    contentSnippet: `บัตรเข้างาน Digital Gala Pass ได้รับการอนุมัติอย่างเป็นทางการ ที่นั่ง: ${seatsList} ยอดชำระ: ${reservation.totalAmount.toLocaleString()} บาท`
  };

  saveEmailDispatchLog(log);

  // Auto-schedule the 24h reminder
  schedule24hReminderEmail(reservation);

  return log;
};

/**
 * 2. ตั้งเวลาส่งเมลแจ้งเตือนก่อนงาน 24 ชม. (20 ธ.ค. 2569 เวลา 18:00 น.)
 */
export const schedule24hReminderEmail = (reservation: ReservationRecord): EmailDispatchRecord => {
  const scheduledTimeStr = '20 ธ.ค. 2569 เวลา 18:00 น. (ก่อนงานเริ่ม 24 ชม.)';
  const seatsList = Object.values(reservation.assignments || {})
    .map(a => `โต๊ะ ${a.table} เก้าอี้ ${a.seat}`)
    .join(', ');

  const subject = `[แจ้งเตือนก่อนงาน 24 ชม.] พรุ่งนี้พบกันในงานฉลองยินดีมหาบัณฑิตพยาบาล มข. ๒๕๖๙ — ${reservation.mainBooker}`;

  const log: EmailDispatchRecord = {
    id: 'REM24-' + Math.floor(100000 + Math.random() * 900000),
    reservationId: reservation.id,
    recipientEmail: reservation.email || 'graduate@nu.kku.ac.th',
    recipientName: reservation.mainBooker,
    type: 'reminder_24h',
    subject,
    table: Object.values(reservation.assignments || {})[0]?.table || 1,
    seat: Object.values(reservation.assignments || {})[0]?.seat || 1,
    ticketCodes: reservation.guests.map(g => g.ticketCode || '').filter(Boolean),
    sentAt: 'รอดำเนินการอัตโนมัติ',
    scheduledFor: scheduledTimeStr,
    status: 'scheduled',
    contentSnippet: `เตือนล่วงหน้า 24 ชม. เตรียมบัตร Digital Pass เข้างานพรุ่งนี้ 21 ธ.ค. 2569 เวลา 18.00 - 22.00 น. ณ รร.ราชาวดี ที่นั่ง: ${seatsList}`
  };

  saveEmailDispatchLog(log);
  return log;
};

/**
 * 3. จำลองการส่งเมลแจ้งเตือน 24 ชม. ทันที (สำหรับทดสอบ)
 */
export const trigger24hReminderEmail = (reservation: ReservationRecord): EmailDispatchRecord => {
  const timestamp = new Date().toLocaleString('th-TH');
  const seatsList = Object.values(reservation.assignments || {})
    .map(a => `โต๊ะ ${a.table} เก้าอี้ ${a.seat}`)
    .join(', ');

  const subject = `[แจ้งเตือนก่อนงาน 24 ชม.] พรุ่งนี้พบกันในงานฉลองยินดีมหาบัณฑิตพยาบาล มข. ๒๕๖๙ — ${reservation.mainBooker}`;

  const log: EmailDispatchRecord = {
    id: 'SENT24-' + Math.floor(100000 + Math.random() * 900000),
    reservationId: reservation.id,
    recipientEmail: reservation.email || 'graduate@nu.kku.ac.th',
    recipientName: reservation.mainBooker,
    type: 'reminder_24h',
    subject,
    table: Object.values(reservation.assignments || {})[0]?.table || 1,
    seat: Object.values(reservation.assignments || {})[0]?.seat || 1,
    ticketCodes: reservation.guests.map(g => g.ticketCode || '').filter(Boolean),
    sentAt: timestamp,
    scheduledFor: '20 ธ.ค. 2569 เวลา 18:00 น.',
    status: 'delivered',
    contentSnippet: `ส่งแจ้งเตือนก่อนเริ่มงาน 24 ชม. สำเร็จ: พรุ่งนี้ 21 ธ.ค. 2569 ลงทะเบียน 17.30 น. เริ่มงาน 18.00 - 22.00 น. รร.ราชาวดี ที่นั่ง: ${seatsList}`
  };

  saveEmailDispatchLog(log);
  return log;
};
