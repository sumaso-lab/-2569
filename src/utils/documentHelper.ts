import { ReservationRecord, AttachedDocument } from '../types';
import { generateRealisticSlipDataUrl } from './slipGenerator';
import { TABLES } from '../data/initialData';

/**
 * Generates an official Certificate / Voucher SVG for a reservation.
 */
export function generateOfficialVoucherSvg(res: ReservationRecord): string {
  const seatsList = res.guests
    ?.map(g => {
      const table = g.table || (res.assignments && res.assignments[0]?.table);
      const seat = g.seat || (res.assignments && res.assignments[0]?.seat);
      const tableName = TABLES.find(t => t.id === table)?.name || 'โต๊ะจัดเลี้ยง';
      return `${g.name} (${g.category}) - โต๊ะ ${table || '-'} (${tableName}) เก้าอี้ ${seat || '-'}`;
    })
    .join(' | ') || `จำนวน ${res.guestCount} ท่าน`;

  const statusLabel = res.status === 'verified'
    ? 'อนุมัติเรียบร้อย (VERIFIED)'
    : res.status === 'pending'
    ? 'รอตรวจสอบ (PENDING)'
    : 'ปฏิเสธ (REJECTED)';

  const statusColor = res.status === 'verified' ? '#10B981' : res.status === 'pending' ? '#F59E0B' : '#EF4444';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 820" width="600" height="820">
    <defs>
      <linearGradient id="voucherGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0B132B"/>
        <stop offset="50%" stop-color="#1C2541"/>
        <stop offset="100%" stop-color="#0B132B"/>
      </linearGradient>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#BF953F"/>
        <stop offset="25%" stop-color="#FCF6BA"/>
        <stop offset="50%" stop-color="#B38728"/>
        <stop offset="75%" stop-color="#FBF5B7"/>
        <stop offset="100%" stop-color="#AA771C"/>
      </linearGradient>
      <pattern id="diag" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M-1,1 l2,-2 M0,20 l20,-20 M19,21 l2,-2" stroke="#ffffff" stroke-width="0.3" opacity="0.04"/>
      </pattern>
    </defs>

    <!-- Certificate Background -->
    <rect width="600" height="820" rx="20" fill="url(#voucherGrad)"/>
    <rect width="600" height="820" rx="20" fill="url(#diag)"/>

    <!-- Double Gold Border Frame -->
    <rect x="18" y="18" width="564" height="784" rx="14" fill="none" stroke="url(#goldGrad)" stroke-width="2.5"/>
    <rect x="25" y="25" width="550" height="770" rx="10" fill="none" stroke="#D4AF37" stroke-width="0.8" opacity="0.6"/>

    <!-- Corner Ornaments -->
    <circle cx="36" cy="36" r="5" fill="#D4AF37"/>
    <circle cx="564" cy="36" r="5" fill="#D4AF37"/>
    <circle cx="36" cy="784" r="5" fill="#D4AF37"/>
    <circle cx="564" cy="784" r="5" fill="#D4AF37"/>

    <!-- Header Emblem Circle -->
    <circle cx="300" cy="85" r="38" fill="#1C2541" stroke="url(#goldGrad)" stroke-width="2"/>
    <text x="300" y="93" font-family="'Noto Sans Thai', sans-serif" font-size="28" font-weight="900" fill="url(#goldGrad)" text-anchor="middle">FON</text>

    <!-- Certificate Title -->
    <text x="300" y="145" font-family="'Noto Serif Thai', serif" font-size="20" font-weight="700" fill="url(#goldGrad)" text-anchor="middle" letter-spacing="1">
      หนังสือยืนยันการลงทะเบียน &amp; สำรองที่นั่ง
    </text>
    <text x="300" y="170" font-family="'Noto Sans Thai', sans-serif" font-size="12" font-weight="500" fill="#94A3B8" text-anchor="middle">
      FACULTY OF NURSING · KHON KAEN UNIVERSITY · GRADUATION GALA 2569
    </text>

    <line x1="80" y1="190" x2="520" y2="190" stroke="url(#goldGrad)" stroke-width="1.2" opacity="0.5"/>

    <!-- Booking Details Box -->
    <rect x="50" y="210" width="500" height="380" rx="14" fill="#0E1626" stroke="#334155" stroke-width="1"/>

    <!-- Data Rows -->
    <text x="75" y="245" font-family="'Noto Sans Thai', sans-serif" font-size="13" font-weight="400" fill="#94A3B8">รหัสการจอง (Booking ID):</text>
    <text x="525" y="245" font-family="monospace" font-size="15" font-weight="700" fill="#FDE047" text-anchor="end">${res.id}</text>
    <line x1="75" y1="260" x2="525" y2="260" stroke="#1E293B" stroke-width="1"/>

    <text x="75" y="290" font-family="'Noto Sans Thai', sans-serif" font-size="13" font-weight="400" fill="#94A3B8">ผู้จองหลัก (Main Booker):</text>
    <text x="525" y="290" font-family="'Noto Sans Thai', sans-serif" font-size="15" font-weight="700" fill="#FFFFFF" text-anchor="end">${res.mainBooker}</text>
    <line x1="75" y1="305" x2="525" y2="305" stroke="#1E293B" stroke-width="1"/>

    <text x="75" y="335" font-family="'Noto Sans Thai', sans-serif" font-size="13" font-weight="400" fill="#94A3B8">เบอร์โทรศัพท์ (Contact):</text>
    <text x="525" y="335" font-family="'Noto Sans Thai', sans-serif" font-size="14" font-weight="600" fill="#E2E8F0" text-anchor="end">${res.phone}</text>
    <line x1="75" y1="350" x2="525" y2="350" stroke="#1E293B" stroke-width="1"/>

    <text x="75" y="380" font-family="'Noto Sans Thai', sans-serif" font-size="13" font-weight="400" fill="#94A3B8">อีเมลรับบัตร (Email):</text>
    <text x="525" y="380" font-family="'Noto Sans Thai', sans-serif" font-size="13" font-weight="500" fill="#E2E8F0" text-anchor="end">${res.email || '-'}</text>
    <line x1="75" y1="395" x2="525" y2="395" stroke="#1E293B" stroke-width="1"/>

    <text x="75" y="425" font-family="'Noto Sans Thai', sans-serif" font-size="13" font-weight="400" fill="#94A3B8">จำนวนที่นั่ง (Seats):</text>
    <text x="525" y="425" font-family="'Noto Sans Thai', sans-serif" font-size="14" font-weight="700" fill="#FFFFFF" text-anchor="end">${res.guestCount} ท่าน (โต๊ะกลมจัดเลี้ยง)</text>
    <line x1="75" y1="440" x2="525" y2="440" stroke="#1E293B" stroke-width="1"/>

    <text x="75" y="470" font-family="'Noto Sans Thai', sans-serif" font-size="13" font-weight="400" fill="#94A3B8">ยอดชำระรวม (Amount):</text>
    <text x="525" y="470" font-family="'Noto Sans Thai', sans-serif" font-size="16" font-weight="800" fill="#FBBF24" text-anchor="end">${(res.guestCount * 799).toLocaleString()} บาท</text>
    <line x1="75" y1="485" x2="525" y2="485" stroke="#1E293B" stroke-width="1"/>

    <text x="75" y="515" font-family="'Noto Sans Thai', sans-serif" font-size="13" font-weight="400" fill="#94A3B8">สถานะการตรวจสอบ (Status):</text>
    <text x="525" y="515" font-family="'Noto Sans Thai', sans-serif" font-size="14" font-weight="800" fill="${statusColor}" text-anchor="end">${statusLabel}</text>
    <line x1="75" y1="530" x2="525" y2="530" stroke="#1E293B" stroke-width="1"/>

    <text x="75" y="555" font-family="'Noto Sans Thai', sans-serif" font-size="12" font-weight="400" fill="#94A3B8">ผังที่นั่งที่ระบุ:</text>
    <text x="75" y="575" font-family="'Noto Sans Thai', sans-serif" font-size="12" font-weight="600" fill="#38BDF8">${seatsList.length > 55 ? seatsList.substring(0, 52) + '...' : seatsList}</text>

    <!-- Event Schedule Notice -->
    <rect x="50" y="605" width="500" height="90" rx="12" fill="#1E293B" stroke="#D4AF37" stroke-width="0.8" opacity="0.9"/>
    <text x="75" y="632" font-family="'Noto Sans Thai', sans-serif" font-size="13" font-weight="700" fill="#FDE047">กำหนดการจัดงาน:</text>
    <text x="75" y="655" font-family="'Noto Sans Thai', sans-serif" font-size="12" font-weight="500" fill="#FFFFFF">วันอาทิตย์ที่ 21 ธันวาคม 2569 · เวลา 18.00 - 22.00 น. (ลงทะเบียน 17.30 น.)</text>
    <text x="75" y="678" font-family="'Noto Sans Thai', sans-serif" font-size="11" font-weight="400" fill="#94A3B8">ณ ห้องแกรนด์บอลรูม โรงแรมราชาวดี ขอนแก่น (สนามบิน)</text>

    <!-- Official Stamp & Signature Area -->
    <circle cx="480" cy="740" r="34" fill="none" stroke="#D4AF37" stroke-width="2" stroke-dasharray="4 2"/>
    <circle cx="480" cy="740" r="30" fill="none" stroke="#D4AF37" stroke-width="0.8"/>
    <text x="480" y="736" font-family="'Noto Sans Thai', sans-serif" font-size="9" font-weight="700" fill="#D4AF37" text-anchor="middle">คณะพยาบาลศาสตร์</text>
    <text x="480" y="748" font-family="'Noto Sans Thai', sans-serif" font-size="8" font-weight="600" fill="#D4AF37" text-anchor="middle">ม.ขอนแก่น</text>
    <text x="480" y="758" font-family="monospace" font-size="7" font-weight="700" fill="#D4AF37" text-anchor="middle">VERIFIED</text>

    <text x="75" y="735" font-family="'Noto Sans Thai', sans-serif" font-size="11" font-weight="500" fill="#94A3B8">ออกเอกสารเมื่อ: ${res.createdAt || '20 ธ.ค. 2569'}</text>
    <text x="75" y="755" font-family="'Noto Sans Thai', sans-serif" font-size="10" font-weight="400" fill="#64748B">ระบบสำรองที่นั่งงานฉลองยินดีบัณฑิต คณะพยาบาลศาสตร์ มข. ๒๕๖๙</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Returns all attached documents for any reservation.
 * Guarantees every booking has at least its payment slip and official booking voucher.
 */
/**
 * Returns all attached documents for any reservation.
 * Strictly adheres to rule: If there is no real file in Storage/DB, mark as missing file and DO NOT create fake slips.
 */
export function getReservationDocuments(res: ReservationRecord): AttachedDocument[] {
  if (res.attachedDocuments && res.attachedDocuments.length > 0) {
    return res.attachedDocuments;
  }

  const timestamp = res.slipTimestamp || res.createdAt || 'บันทึกในระบบ';
  const hasRealSlip = Boolean(res.slipUrl && res.slipUrl.trim().length > 0);
  const slipFileName = res.slipFileName || 'หลักฐานการโอนเงิน';
  const isPdf = slipFileName.toLowerCase().endsWith('.pdf') || (res.slipUrl && res.slipUrl.toLowerCase().includes('.pdf'));

  const docs: AttachedDocument[] = [];

  // Document 1: Real payment slip (or explicit missing indicator)
  docs.push({
    id: `${res.id}-doc-slip`,
    name: hasRealSlip ? `หลักฐานการโอนเงิน (${slipFileName})` : 'หลักฐานการโอนเงิน (ไม่พบไฟล์ใน Storage)',
    type: 'slip',
    url: hasRealSlip ? res.slipUrl! : '',
    uploadedAt: timestamp,
    size: hasRealSlip ? 'ต้นฉบับ' : '0 B',
    status: res.status,
    hasRealFile: hasRealSlip,
    mimeType: isPdf ? 'application/pdf' : 'image/jpeg',
    storagePath: hasRealSlip ? res.slipUrl : undefined
  });

  // Document 2: Official System Booking Voucher (Generated on demand for staff reference)
  const voucherUrl = generateOfficialVoucherSvg(res);
  docs.push({
    id: `${res.id}-doc-voucher`,
    name: `หนังสือยืนยันการลงทะเบียน & สำรองผังที่นั่ง (${res.id})`,
    type: 'voucher',
    url: voucherUrl,
    uploadedAt: res.createdAt || timestamp,
    size: '240 KB',
    status: res.status,
    hasRealFile: true,
    mimeType: 'image/svg+xml'
  });

  return docs;
}

/**
 * Returns a flattened array of all attached documents across all reservations,
 * enriched with reservation metadata.
 */
export interface EnrichedAttachedDocument extends AttachedDocument {
  reservationId: string;
  bookerName: string;
  phone: string;
  email?: string;
  guestCount: number;
  totalAmount: number;
  reservationStatus: 'verified' | 'pending' | 'rejected';
}

export function getAllAttachedDocuments(reservations: ReservationRecord[]): EnrichedAttachedDocument[] {
  const result: EnrichedAttachedDocument[] = [];

  reservations.forEach(res => {
    const docs = getReservationDocuments(res);
    docs.forEach(doc => {
      result.push({
        ...doc,
        reservationId: res.id,
        bookerName: res.mainBooker,
        phone: res.phone,
        email: res.email,
        guestCount: res.guestCount,
        totalAmount: (res.guestCount || 1) * 799,
        reservationStatus: res.status
      });
    });
  });

  return result;
}
