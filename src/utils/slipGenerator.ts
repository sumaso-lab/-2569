/**
 * Generates realistic Thai Mobile Banking Transfer Slips as high-resolution SVG Data URLs.
 * Used for attached slip previews, staff inspection, and test cases.
 */

export interface SlipOptions {
  payerName?: string;
  bookerName?: string;
  amount: number;
  timestamp?: string;
  dateStr?: string;
  refId?: string;
  bank?: 'SCB' | 'KBANK' | 'KTB';
}

export function generateRealisticSlipDataUrl(options: SlipOptions): string {
  const payer = options.payerName || options.bookerName || 'ผู้ร่วมงาน คณะพยาบาลศาสตร์ มข.';
  const time = options.timestamp || options.dateStr || new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
  const {
    amount,
    refId = 'SCB' + Math.floor(1000000000 + Math.random() * 9000000000),
    bank = 'SCB'
  } = options;
  const payerName = payer;
  const timestamp = time;

  const formattedAmount = amount.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const isSCB = bank === 'SCB';
  const primaryColor = isSCB ? '#4E2A84' : '#138f2d'; // SCB Purple vs KBANK Green
  const accentColor = isSCB ? '#F3B229' : '#00a950';
  const bankTitle = isSCB ? 'SCB EASY' : 'K PLUS';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 680" width="480" height="680">
  <defs>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="#2D154F"/>
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.12"/>
    </filter>
  </defs>

  <!-- Background Paper -->
  <rect width="480" height="680" rx="24" fill="#FFFFFF"/>
  <rect x="0" y="0" width="480" height="680" rx="24" fill="none" stroke="#E2E8F0" stroke-width="2"/>

  <!-- Top Header Banner -->
  <path d="M0,24 Q0,0 24,0 L456,0 Q480,0 480,24 L480,110 L0,110 Z" fill="url(#headerGrad)"/>
  
  <!-- Bank Brand Wordmark -->
  <circle cx="48" cy="55" r="22" fill="#FFFFFF" opacity="0.15"/>
  <text x="48" y="62" font-family="'Noto Sans Thai', sans-serif" font-size="20" font-weight="900" fill="#FFFFFF" text-anchor="middle">S</text>
  <text x="82" y="52" font-family="'Noto Sans Thai', sans-serif" font-size="18" font-weight="800" fill="#FFFFFF">${bankTitle}</text>
  <text x="82" y="70" font-family="'Noto Sans Thai', sans-serif" font-size="11" font-weight="500" fill="${accentColor}">โอนเงินสำเร็จ · Transfer Successful</text>

  <!-- Verified Check Badge -->
  <circle cx="430" cy="55" r="16" fill="#10B981"/>
  <path d="M422,55 L428,61 L438,49" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Amount Display Card -->
  <rect x="24" y="130" width="432" height="100" rx="16" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1"/>
  <text x="44" y="160" font-family="'Noto Sans Thai', sans-serif" font-size="12" font-weight="600" fill="#64748B">จำนวนเงินที่โอน (AMOUNT)</text>
  <text x="44" y="202" font-family="'Noto Serif Thai', serif" font-size="34" font-weight="800" fill="#0F172A">฿ ${formattedAmount}</text>
  <text x="436" y="200" font-family="'Noto Sans Thai', sans-serif" font-size="12" font-weight="600" fill="#10B981" text-anchor="end">ค่าธรรมเนียม: ฿ 0.00</text>

  <!-- Transfer Details -->
  <g transform="translate(30, 255)">
    <!-- From Section -->
    <circle cx="14" cy="14" r="10" fill="#EEF2F6"/>
    <text x="14" y="18" font-family="sans-serif" font-size="10" font-weight="bold" fill="#64748B" text-anchor="middle">จาก</text>
    <text x="36" y="12" font-family="'Noto Sans Thai', sans-serif" font-size="11" font-weight="600" fill="#64748B">ผู้โอนเงิน (From)</text>
    <text x="36" y="30" font-family="'Noto Sans Thai', sans-serif" font-size="14" font-weight="700" fill="#0F172A">${payerName}</text>
    <text x="36" y="46" font-family="monospace" font-size="11" fill="#64748B">xxx-xxx${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1 + Math.random() * 9)} (SCB)</text>

    <!-- Arrow Down Divider -->
    <line x1="14" y1="56" x2="14" y2="76" stroke="#CBD5E1" stroke-width="2" stroke-dasharray="3,3"/>
    <polygon points="14,80 10,72 18,72" fill="#94A3B8"/>

    <!-- To Section -->
    <circle cx="14" cy="100" r="10" fill="#FEF3C7"/>
    <text x="14" y="104" font-family="sans-serif" font-size="10" font-weight="bold" fill="#D97706" text-anchor="middle">ถึง</text>
    <text x="36" y="98" font-family="'Noto Sans Thai', sans-serif" font-size="11" font-weight="600" fill="#D97706">ผู้รับเงิน (To)</text>
    <text x="36" y="116" font-family="'Noto Sans Thai', sans-serif" font-size="14" font-weight="700" fill="#0F172A">นายชยณัฐ / น.ส.สุมาลี</text>
    <text x="36" y="132" font-family="'Noto Sans Thai', sans-serif" font-size="11" font-weight="500" fill="#475569">โครงการยินดีบัณฑิต พยาบาล มข. ๒๕๖๙</text>
    <text x="36" y="148" font-family="monospace" font-size="12" font-weight="bold" fill="#4E2A84">SCB: 551-4-26185-1</text>
  </g>

  <!-- Horizontal Divider -->
  <line x1="24" y1="440" x2="456" y2="440" stroke="#E2E8F0" stroke-width="1.5" stroke-dasharray="4,4"/>

  <!-- Metadata Table -->
  <g transform="translate(36, 465)">
    <text x="0" y="0" font-family="'Noto Sans Thai', sans-serif" font-size="11" fill="#64748B">วันที่-เวลาที่ทำรายการ:</text>
    <text x="408" y="0" font-family="'Noto Sans Thai', sans-serif" font-size="12" font-weight="600" fill="#0F172A" text-anchor="end">${timestamp}</text>

    <text x="0" y="24" font-family="'Noto Sans Thai', sans-serif" font-size="11" fill="#64748B">เลขที่อ้างอิง (Ref No.):</text>
    <text x="408" y="24" font-family="monospace" font-size="11" font-weight="700" fill="#0F172A" text-anchor="end">${refId}</text>

    <text x="0" y="48" font-family="'Noto Sans Thai', sans-serif" font-size="11" fill="#64748B">รหัสตรวจสอบสลิป:</text>
    <text x="408" y="48" font-family="monospace" font-size="11" fill="#10B981" text-anchor="end">VERIFIED-OK-799</text>
  </g>

  <!-- Bottom Verification Footer -->
  <rect x="24" y="545" width="432" height="105" rx="16" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1"/>
  
  <!-- Mini QR Code Representation -->
  <rect x="40" y="558" width="80" height="80" rx="8" fill="#0F172A"/>
  <rect x="46" y="564" width="22" height="22" fill="#FFFFFF"/>
  <rect x="50" y="568" width="14" height="14" fill="#0F172A"/>
  <rect x="92" y="564" width="22" height="22" fill="#FFFFFF"/>
  <rect x="96" y="568" width="14" height="14" fill="#0F172A"/>
  <rect x="46" y="610" width="22" height="22" fill="#FFFFFF"/>
  <rect x="50" y="614" width="14" height="14" fill="#0F172A"/>
  <circle cx="80" cy="598" r="8" fill="#F3B229"/>

  <text x="136" y="582" font-family="'Noto Sans Thai', sans-serif" font-size="12" font-weight="700" fill="#0F172A">สลิปการโอนเงินฉบับอิเล็กทรอนิกส์</text>
  <text x="136" y="600" font-family="'Noto Sans Thai', sans-serif" font-size="10" fill="#64748B">สามารถตรวจสอบความถูกต้องได้ด้วย QR Code</text>
  <text x="136" y="616" font-family="'Noto Sans Thai', sans-serif" font-size="10" font-weight="600" fill="#4E2A84">คณะพยาบาลศาสตร์ มหาวิทยาลัยขอนแก่น</text>
  <text x="136" y="630" font-family="'Noto Sans Thai', sans-serif" font-size="9" fill="#94A3B8">งานฉลองยินดีบัณฑิต 21 ธ.ค. 2569</text>
</svg>`;

  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
