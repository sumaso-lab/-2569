import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  Download,
  Mail,
  Copy,
  Check,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Ticket,
  User,
  ExternalLink,
  Award
} from 'lucide-react';
import { AttendeeCategory } from '../types';
import { TABLES } from '../data/initialData';
import { OfficialKKUNurseSealSVG } from './OfficialKKUNurseSealSVG';

export interface DigitalPassCardProps {
  guestName: string;
  category: AttendeeCategory | string;
  table: number;
  seat: number;
  ticketCode: string;
  bookerName?: string;
  phone?: string;
  email?: string;
  checkedIn?: boolean;
  isPendingApproval?: boolean;
  onOpenEmailModal?: () => void;
  showActions?: boolean;
}

export const DigitalPassCard: React.FC<DigitalPassCardProps> = ({
  guestName,
  category,
  table,
  seat,
  ticketCode,
  bookerName,
  phone,
  email,
  checkedIn,
  isPendingApproval = false,
  onOpenEmailModal,
  showActions = true
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [scanUrl, setScanUrl] = useState<string>('');
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const tableObj = TABLES.find(t => t.id === table);
  const tableName = tableObj ? tableObj.name : `โต๊ะที่ ${table}`;
  const zoneName = tableObj ? tableObj.zone : '';

  // Generate real scannable QR Code that encodes a direct check-in URL for any mobile phone camera
  useEffect(() => {
    if (!ticketCode) return;

    let targetUrl = ticketCode;
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      const pathname = window.location.pathname;
      targetUrl = `${origin}${pathname}?ticket=${encodeURIComponent(ticketCode)}&checkin=1`;
    }
    setScanUrl(targetUrl);

    QRCode.toDataURL(targetUrl, {
      width: 480,
      margin: 2,
      color: {
        dark: '#0a0f1d',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Failed to generate QR code', err));
  }, [ticketCode]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(ticketCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `ticket-${ticketCode}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const categoryLabel =
    category === 'faculty'
      ? 'คณาจารย์และผู้บริหาร (โต๊ะกลม 1–2)'
      : category === 'graduate'
      ? 'มหาบัณฑิต ป.โท พยาบาลศาสตร์ มข. (โต๊ะกลม 3–9)'
      : category === 'agn5'
      ? 'กลุ่ม AGN5 (โต๊ะกลม 10–12)'
      : 'ครอบครัวและแขกผู้มีเกียรติ';

  const categoryBadgeColor =
    category === 'faculty'
      ? 'bg-amber-950/90 text-amber-200 border-amber-400/60 shadow-amber-500/20'
      : category === 'graduate'
      ? 'bg-blue-950/90 text-blue-200 border-blue-400/60 shadow-blue-500/20'
      : category === 'agn5'
      ? 'bg-sky-950/90 text-sky-200 border-sky-400/60 shadow-sky-500/20'
      : 'bg-emerald-950/90 text-emerald-200 border-emerald-500/60 shadow-emerald-500/20';

  // High-Resolution Luxury Pass Image Generator ("สามารถโหลดเองได้")
  const handleDownloadPassImage = () => {
    setIsGeneratingImage(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1680;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Obsidian Navy Luxury Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 1680);
      bgGrad.addColorStop(0, '#040711');
      bgGrad.addColorStop(0.35, '#0c152a');
      bgGrad.addColorStop(0.7, '#070d1e');
      bgGrad.addColorStop(1, '#03050c');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 1680);

      // Gold Filigree Border
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 6;
      ctx.strokeRect(36, 36, 1128, 1608);

      ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(48, 48, 1104, 1584);

      // Corner Ornamental Flourishes
      const drawCornerBracket = (x: number, y: number, angleDeg: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((angleDeg * Math.PI) / 180);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 30);
        ctx.lineTo(0, 0);
        ctx.lineTo(30, 0);
        ctx.stroke();
        ctx.restore();
      };
      drawCornerBracket(58, 58, 0);
      drawCornerBracket(1142, 58, 90);
      drawCornerBracket(1142, 1622, 180);
      drawCornerBracket(58, 1622, 270);

      // Top Metallic Gold Ribbon
      const ribbonGrad = ctx.createLinearGradient(36, 0, 1164, 0);
      ribbonGrad.addColorStop(0, '#bf953f');
      ribbonGrad.addColorStop(0.25, '#fcf6ba');
      ribbonGrad.addColorStop(0.5, '#b38728');
      ribbonGrad.addColorStop(0.75, '#fbf5b7');
      ribbonGrad.addColorStop(1, '#aa771c');
      ctx.fillStyle = ribbonGrad;
      ctx.fillRect(36, 36, 1128, 18);

      // Header Text
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 24px "Sarabun", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FACULTY OF NURSING · KHON KAEN UNIVERSITY', 600, 110);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px "Charm", "Sarabun", serif';
      ctx.fillText('บัตรเกียรติยศเข้างานฉลองแสดงความยินดีมหาบัณฑิต ๒๕๖๙', 600, 175);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '24px "Sarabun", sans-serif';
      ctx.fillText('คณะพยาบาลศาสตร์ มหาวิทยาลัยขอนแก่น (โต๊ะกลมจัดเลี้ยง)', 600, 220);

      // Divider line
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(120, 255);
      ctx.lineTo(1080, 255);
      ctx.stroke();

      // Attendee Section
      ctx.fillStyle = '#94a3b8';
      ctx.font = '22px "Sarabun", sans-serif';
      ctx.fillText('ผู้เข้าร่วมงาน / HONORED ATTENDEE', 600, 315);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 54px "Charm", "Sarabun", serif';
      ctx.fillText(guestName, 600, 385);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 26px "Sarabun", sans-serif';
      ctx.fillText(`[ ${categoryLabel} ]`, 600, 435);

      // Round Table Box
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(120, 485, 960, 215);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 3;
      ctx.strokeRect(120, 485, 960, 215);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 24px "Sarabun", sans-serif';
      ctx.fillText('ผังโต๊ะกลมจัดเลี้ยง (8 ที่นั่ง/โต๊ะ)', 600, 535);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 64px "Sarabun", sans-serif';
      ctx.fillText(`โต๊ะ ${table}  ·  เก้าอี้ที่ ${seat}`, 600, 615);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '22px "Sarabun", sans-serif';
      ctx.fillText(`( ${tableName} · ${zoneName} )`, 600, 665);

      // Event Details Box
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px "Sarabun", sans-serif';
      ctx.fillText('วันเสาร์ที่ 21 ธันวาคม 2569  เวลา 16.30 - 20.00 น.', 600, 755);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '26px "Sarabun", sans-serif';
      ctx.fillText('โรงแรมราชาวดี ขอนแก่น (ห้องแกรนด์บอลรูม)', 600, 800);

      // QR Code Box
      if (qrDataUrl) {
        const qrImg = new Image();
        qrImg.onload = () => {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(390, 860, 420, 420);
          ctx.strokeStyle = '#d4af37';
          ctx.lineWidth = 4;
          ctx.strokeRect(380, 850, 440, 440);

          ctx.drawImage(qrImg, 410, 880, 380, 380);

          // Ticket Code & verification label
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 32px monospace';
          ctx.fillText(ticketCode, 600, 1345);

          ctx.fillStyle = '#cbd5e1';
          ctx.font = '22px "Sarabun", sans-serif';
          ctx.fillText('สแกน QR Code ด้วยกล้องสมาร์ทโฟนเพื่อเช็คอินเข้างาน ณ ประตูทางเข้า', 600, 1395);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '18px "Sarabun", sans-serif';
          ctx.fillText('บัตรเกียรติยศเฉพาะบุคคล · คณะพยาบาลศาสตร์ มหาวิทยาลัยขอนแก่น · สอบถาม 095-186-4940', 600, 1540);

          const link = document.createElement('a');
          link.download = `VIP-GalaPass-${ticketCode}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          setIsGeneratingImage(false);
        };
        qrImg.src = qrDataUrl;
      } else {
        setIsGeneratingImage(false);
      }
    } catch (e) {
      console.error('Download pass error', e);
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Luxury Gala Pass Container */}
      <div
        ref={cardRef}
        id="digital-pass-card"
        className="relative bg-gradient-to-b from-[#050814] via-[#0b1428] to-[#04060e] text-white rounded-3xl border-2 border-amber-400/80 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(251,191,36,0.25)] overflow-hidden transition-all duration-300"
      >
        {/* Golden Guilloché & Radial Accent Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/15 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Metallic Gold Ribbon Bar */}
        <div className="h-2.5 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 shadow-sm" />

        {/* Pass Header */}
        <div className="p-5 sm:p-7 pb-4 border-b border-amber-500/40 relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-13 h-13 rounded-2xl bg-slate-900 border border-amber-400/60 p-1 shadow-lg shadow-amber-500/10 flex items-center justify-center shrink-0">
                <OfficialKKUNurseSealSVG size={42} />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-bold tracking-widest uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>VIP DIGITAL GALA PASS</span>
                </div>
                <h4 className="font-serif-thai text-base sm:text-lg font-bold text-amber-100 leading-tight">
                  งานฉลองแสดงความยินดีบัณฑิต ๒๕๖๙
                </h4>
                <p className="text-[11px] text-slate-300">
                  คณะพยาบาลศาสตร์ มหาวิทยาลัยขอนแก่น
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="text-right shrink-0">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${
                  checkedIn
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                    : isPendingApproval
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${checkedIn ? 'bg-emerald-400 animate-pulse' : isPendingApproval ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                {checkedIn ? 'เข้างานแล้ว' : isPendingApproval ? 'รอเจ้าหน้าที่อนุมัติ' : 'บัตรทางการ (พร้อมเข้างาน)'}
              </span>
            </div>
          </div>
        </div>

        {/* Guest Distinction & Seating Spotlight */}
        <div className="p-5 sm:p-7 space-y-5 relative">
          {/* Guest Name & Category */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                ผู้เข้าร่วมงาน / Honored Attendee
              </span>
              <h2 className="font-serif-thai text-2xl sm:text-3xl font-bold text-white tracking-wide mt-0.5">
                {guestName}
              </h2>
            </div>
            <div className="self-start sm:self-center">
              <span className={`inline-block px-3.5 py-1.5 rounded-xl text-xs font-semibold border ${categoryBadgeColor}`}>
                {categoryLabel}
              </span>
            </div>
          </div>

          {/* Golden Seating Box for Circular Banquet Table */}
          <div className="bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-slate-900/95 rounded-2xl p-4 sm:p-5 border-2 border-amber-400/50 shadow-inner grid grid-cols-2 sm:grid-cols-3 gap-4 items-center">
            {/* Table */}
            <div className="border-r border-slate-800 pr-3">
              <span className="text-[11px] text-amber-300 font-semibold uppercase tracking-wider block">
                โต๊ะกลมจัดเลี้ยง
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-serif-thai text-2xl sm:text-3xl font-extrabold text-amber-200">
                  โต๊ะ {table}
                </span>
              </div>
              <span className="text-[11px] text-slate-300 block truncate">
                {tableName}
              </span>
              <span className="text-[10px] text-amber-400/80 block mt-0.5 truncate">
                {zoneName}
              </span>
            </div>

            {/* Seat */}
            <div className="sm:border-r border-slate-800 pr-3">
              <span className="text-[11px] text-amber-300 font-semibold uppercase tracking-wider block">
                เก้าอี้ประจำโต๊ะ
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-serif-thai text-2xl sm:text-3xl font-extrabold text-white">
                  ที่ {seat}
                </span>
                <span className="text-xs text-slate-400">/ 8</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                โต๊ะกลมละ 8 ที่นั่ง
              </span>
            </div>

            {/* Code */}
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[11px] text-amber-300 font-semibold uppercase tracking-wider block">
                รหัสบัตร
              </span>
              <span className="font-mono text-xs sm:text-sm font-bold text-amber-300 block mt-1 tracking-wider truncate">
                {ticketCode}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                บันทึกระบุชื่อแล้ว
              </span>
            </div>
          </div>

          {/* Event Logistics Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
            <div className="flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white block">วันเสาร์ที่ 21 ธันวาคม 2569</span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> เวลา 16.30 - 20.00 น.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
              <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white block">โรงแรมราชาวดี ขอนแก่น</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  ห้องแกรนด์บอลรูม (Rachawadee Airport Hotel)
                </span>
              </div>
            </div>
          </div>

          {/* Notch divider */}
          <div className="relative py-2">
            <div className="border-t border-dashed border-amber-500/40 w-full" />
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-950 border-r border-amber-400/50" />
            <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-950 border-l border-amber-400/50" />
          </div>

          {/* REAL SCANNABLE QR CODE SECTION */}
          <div className="bg-slate-950/90 rounded-2xl p-5 border border-amber-400/40 flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left shadow-md">
            <div className="space-y-1.5 flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-400/10 text-amber-300 text-[11px] font-bold">
                <Ticket className="w-3.5 h-3.5" />
                <span>OFFICIAL CHECK-IN QR CODE</span>
              </div>
              <h4 className="font-serif-thai text-base font-bold text-white">
                สแกนเช็คอินเข้างาน (QR สแกนได้จริง)
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                สแกนได้จริงด้วยกล้องมือถือ iPhone, Android, แอป LINE หรือเครื่องอ่านบาร์โค้ด ณ จุดลงทะเบียนโรงแรมราชาวดี ขอนแก่น
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="font-mono text-xs font-bold text-amber-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-amber-500/30 tracking-wider">
                  {ticketCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                  title="คัดลอกรหัสบัตร"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                </button>
                {scanUrl && (
                  <a
                    href={scanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs rounded-lg border border-amber-500/40 flex items-center gap-1 transition-colors font-semibold"
                    title="ทดสอบเปิดหน้าเช็คอินเสมือนสแกนด้วยกล้อง"
                  >
                    <ExternalLink className="w-3 h-3 text-amber-400" />
                    <span>ทดสอบจำลองการสแกน</span>
                  </a>
                )}
              </div>
            </div>

            {/* The Real Scannable QR Code Canvas / Image */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="p-2.5 bg-white rounded-2xl shadow-xl border-2 border-amber-400 flex items-center justify-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for ${ticketCode}`}
                    className="w-32 h-32 object-contain"
                  />
                ) : (
                  <div className="w-32 h-32 flex items-center justify-center text-slate-400 text-xs">
                    กำลังสร้าง QR...
                  </div>
                )}
              </div>
              <span className="text-[10px] text-amber-300/80 font-mono mt-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>กล้องมือถือสแกนได้จริง 100%</span>
              </span>
            </div>
          </div>
        </div>

        {/* Footer info & Security Stamp */}
        <div className="px-6 py-3 bg-slate-950 border-t border-amber-500/30 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <div className="flex items-center gap-1 text-slate-400">
            <span>สอบถามเพิ่มเติม:</span>
            <span className="text-amber-300 font-semibold">095-186-4940</span>
          </div>
          <div className="text-[10px] text-slate-400">
            บัตรเฉพาะบุคคล · คณะพยาบาลศาสตร์ มข.
          </div>
        </div>
      </div>

      {/* Action Buttons: Download Pass Image ("โหลดเองได้"), Print, Email, Download QR */}
      {showActions && (
        <div className="no-print mt-4 flex flex-wrap items-center justify-center gap-2.5">
          {/* Direct Image Download ("สามารถโหลดเองได้") */}
          <button
            type="button"
            onClick={handleDownloadPassImage}
            disabled={isGeneratingImage}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm shadow-md hover:shadow-lg flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
            title="ดาวน์โหลดไฟล์รูปภาพบัตรเข้างาน PNG คุณภาพสูงลงเครื่องทันที"
          >
            <Download className="w-4 h-4 text-slate-950" />
            <span>{isGeneratingImage ? 'กำลังบันทึกภาพบัตร...' : 'ดาวน์โหลดบัตรเข้างาน (โหลดเองได้)'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs sm:text-sm border border-amber-500/40 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>พิมพ์ / PDF</span>
          </button>

          {onOpenEmailModal && (
            <button
              type="button"
              onClick={onOpenEmailModal}
              className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs sm:text-sm shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>ส่งเข้าอีเมล</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadQR}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs sm:text-sm border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>บันทึก QR Code</span>
          </button>
        </div>
      )}
    </div>
  );
};
