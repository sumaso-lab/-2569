import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  DollarSign,
  Download,
  Search,
  RefreshCw,
  ShieldCheck,
  Award,
  Image as ImageIcon,
  Trash2,
  Ticket,
  Printer,
  X,
  QrCode,
  Eye,
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  Mail
} from 'lucide-react';
import { ExistingSeat, ReservationRecord } from '../types';
import { TABLES } from '../data/initialData';
import { KKUNursingLogo } from './KKUNursingLogo';
import { EmailTicketModal } from './EmailTicketModal';

interface AdminConsoleProps {
  existingSeats: ExistingSeat[];
  reservations: ReservationRecord[];
  onToggleCheckIn: (table: number, seat: number) => void;
  onResetData: () => void;
}

const TICKET_PRICE = 799;

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  existingSeats,
  reservations,
  onToggleCheckIn,
  onResetData
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTableFilter, setSelectedTableFilter] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checkedIn' | 'notCheckedIn'>('all');
  const [selectedTicketSeat, setSelectedTicketSeat] = useState<ExistingSeat | null>(null);
  const [emailModalSeat, setEmailModalSeat] = useState<ExistingSeat | null>(null);

  // Stats calculation
  const totalCapacity = 120;
  const totalOccupied = existingSeats.length;
  const checkedInCount = existingSeats.filter(s => s.checkedIn).length;
  const totalRevenue = totalOccupied * TICKET_PRICE;

  // Filtered roster
  const filteredSeats = existingSeats.filter(s => {
    if (selectedTableFilter !== 'all' && s.table !== selectedTableFilter) return false;
    if (statusFilter === 'checkedIn' && !s.checkedIn) return false;
    if (statusFilter === 'notCheckedIn' && s.checkedIn) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = s.guestName.toLowerCase().includes(q);
      const matchCode = s.ticketCode?.toLowerCase().includes(q);
      if (!matchName && !matchCode) return false;
    }

    return true;
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Table', 'Seat', 'Guest Name', 'Category', 'Ticket Code', 'Check-In Status'];
    const rows = existingSeats.map(s => [
      `Table ${s.table}`,
      `Seat ${s.seat}`,
      `"${s.guestName.replace(/"/g, '""')}"`,
      s.category,
      s.ticketCode || '',
      s.checkedIn ? 'Checked-In' : 'Pending'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `grad69_guest_list_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto mb-16 space-y-8">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-amber-500/40 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>ORGANIZER MANAGEMENT CONSOLE</span>
            </div>
            <h2 className="font-serif-thai text-2xl sm:text-3xl font-bold text-amber-100">
              ระบบจัดการผังที่นั่งและเช็คอินเจ้าหน้าที่
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              ตรวจสอบรายชื่อผู้เข้าร่วมงานรายโต๊ะ ควบคุมสถานะ Check-in หน้าประตู และส่งออกรายงาน
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-xl text-xs font-medium border border-sky-500/30 flex items-center gap-1.5 cursor-pointer transition-colors">
              <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>เปลี่ยนไฟล์ตราคณะพยาบาล</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      localStorage.setItem('kku_nursing_custom_logo', reader.result as string);
                      window.location.reload();
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลดรายชื่อ CSV</span>
            </button>

            <button
              type="button"
              onClick={onResetData}
              className="px-4 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded-xl text-xs font-medium border border-rose-800/60 flex items-center gap-1.5 transition-colors"
              title="ล้างข้อมูลผู้จองทั้งหมดให้โต๊ะว่าง 100%"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>เคลียร์คนจองออกให้หมด</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>ผู้ลงทะเบียนทั้งหมด</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white font-serif-thai tabular-nums">
              {totalOccupied} / {totalCapacity}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">
              คิดเป็น {Math.round((totalOccupied / totalCapacity) * 100)}% ของความจุ
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Check-in หน้างานแล้ว</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-serif-thai tabular-nums">
              {checkedInCount} ท่าน
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              รอเข้างาน {totalOccupied - checkedInCount} ท่าน
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>ยอดเงินลงทะเบียนรวม</span>
              <DollarSign className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-300 font-serif-thai tabular-nums">
              {totalRevenue.toLocaleString('th-TH')} บ.
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              เฉลี่ย 799 บาท / ท่าน
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>โต๊ะที่เปิดใช้งาน</span>
              <Award className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100 font-serif-thai tabular-nums">
              15 โต๊ะ
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              3 โซน (อาจารย์ 1–2, บัณฑิต 3–7, ผู้ร่วมงาน 8–15)
            </div>
          </div>
        </div>
      </div>

      {/* Roster Table & Search Controls */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-500/20 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 mb-6">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อผู้ร่วมงาน หรือ รหัสบัตร..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedTableFilter}
              onChange={e => setSelectedTableFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-700 outline-none"
            >
              <option value="all">ทุกโต๊ะ (1–15)</option>
              {TABLES.map(t => (
                <option key={t.id} value={t.id}>
                  โต๊ะ {t.id} ({t.name})
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-700 outline-none"
            >
              <option value="all">สถานะ Check-in ทั้งหมด</option>
              <option value="checkedIn">เฉพาะที่ Check-in แล้ว</option>
              <option value="notCheckedIn">ยังไม่ Check-in</option>
            </select>
          </div>
        </div>

        {/* Table Roster */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/60">
                <th className="py-3 px-4 font-semibold">โต๊ะ / เก้าอี้</th>
                <th className="py-3 px-4 font-semibold">ชื่อ–นามสกุล (กดเพื่อดูบัตร)</th>
                <th className="py-3 px-4 font-semibold">ประเภท</th>
                <th className="py-3 px-4 font-semibold">รหัสบัตร</th>
                <th className="py-3 px-4 font-semibold text-center">ดูตัวอย่าง / พิมพ์</th>
                <th className="py-3 px-4 font-semibold text-center">สถานะ Check-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSeats.map((seat, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900">โต๊ะ {seat.table}</span>
                    <span className="text-slate-500 text-xs block">เก้าอี้ที่ {seat.seat}</span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => setSelectedTicketSeat(seat)}
                      className="text-left font-bold text-slate-900 hover:text-amber-600 flex items-center gap-1.5 transition-colors group cursor-pointer"
                      title="กดเพื่อดูตัวอย่างบัตรดิจิทัลและพิมพ์"
                    >
                      <span className="group-hover:underline">{seat.guestName}</span>
                      <Eye className="w-3.5 h-3.5 text-amber-600 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                      seat.category === 'faculty'
                        ? 'bg-amber-100 text-amber-900'
                        : seat.category === 'graduate'
                        ? 'bg-sky-100 text-sky-900'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {seat.category === 'faculty' ? 'คณาจารย์' : seat.category === 'graduate' ? 'บัณฑิต' : 'แขกผู้มีเกียรติ'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-700">
                    {seat.ticketCode || `GRAD69-${seat.table}${seat.seat}`}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedTicketSeat(seat)}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-semibold border border-amber-300/80 inline-flex items-center gap-1 shadow-xs transition-colors"
                      title="กดเพื่อแสดงตัวอย่างบัตรและสั่งพิมพ์"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-600" />
                      <span>พิมพ์ตัวอย่าง</span>
                    </button>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => onToggleCheckIn(seat.table, seat.seat)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                        seat.checkedIn
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-800'
                      }`}
                    >
                      {seat.checkedIn ? '✓ Check-in แล้ว' : 'กดเพื่อ Check-in'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredSeats.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs sm:text-sm">
              ไม่พบรายชื่อตามเงื่อนไขที่เลือก
            </div>
          )}
        </div>
      </div>

      {/* TICKET PREVIEW MODAL FOR ADMIN WITH PRINT PREVIEW */}
      {selectedTicketSeat && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl max-w-2xl w-full border border-amber-500/40 shadow-2xl overflow-hidden relative my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="no-print px-6 py-4 bg-slate-950 border-b border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300">
                <Ticket className="w-5 h-5 text-amber-400" />
                <span className="font-serif-thai font-bold text-base">
                  ตรวจสอบและพิมพ์บัตรเข้างาน (Digital Pass Preview)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicketSeat(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content / Ticket Container */}
            <div className="p-6">
              <div
                id="printable-admin-ticket"
                className="ticket-card bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl border-2 border-amber-500/50 p-6 sm:p-8 shadow-2xl relative overflow-hidden"
              >
                {/* Decorative notches */}
                <div className="absolute top-1/2 -left-4 w-8 h-8 rounded-full bg-slate-900 border-r border-amber-500/40 -translate-y-1/2 z-20 hidden sm:block" />
                <div className="absolute top-1/2 -right-4 w-8 h-8 rounded-full bg-slate-900 border-l border-amber-500/40 -translate-y-1/2 z-20 hidden sm:block" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <KKUNursingLogo size="sm" />
                      <div>
                        <span className="font-serif-thai text-amber-200 text-xs font-bold tracking-wider block">
                          ยินดีบัณฑิตพยาบาล มข. ๒๕๖๙ · FACULTY OF NURSING KKU
                        </span>
                        <span className="text-[10px] text-slate-400">
                          คณะพยาบาลศาสตร์ มหาวิทยาลัยขอนแก่น · OFFICIAL INVITATION PASS
                        </span>
                      </div>
                    </div>

                    <h3 className="font-serif-thai text-2xl sm:text-3xl font-bold text-white pt-1">
                      {selectedTicketSeat.guestName}
                    </h3>

                    <div className="text-xs text-amber-300 font-medium flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/30">
                        {selectedTicketSeat.category === 'faculty'
                          ? 'คณาจารย์ / ผู้บริหาร'
                          : selectedTicketSeat.category === 'graduate'
                          ? 'บัณฑิตพยาบาลศาสตร์'
                          : 'ครอบครัว / แขกผู้มีเกียรติ'}
                      </span>
                      <span className="text-slate-400">· โต๊ะจีนจัดเลี้ยง</span>
                    </div>

                    <div className="inline-flex items-center gap-4 p-3 bg-slate-900/90 rounded-2xl border border-amber-500/40 shadow-inner">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">โต๊ะ</span>
                        <span className="font-serif-thai text-2xl font-bold text-amber-300">
                          โต๊ะ {selectedTicketSeat.table}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">
                          {TABLES.find(t => t.id === selectedTicketSeat.table)?.name}
                        </span>
                      </div>
                      <div className="h-8 w-px bg-slate-700" />
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">เก้าอี้</span>
                        <span className="font-serif-thai text-2xl font-bold text-amber-300">
                          ที่ {selectedTicketSeat.seat}
                        </span>
                        <span className="text-[10px] text-emerald-400 block">
                          (1 ใน 8 ที่นั่ง)
                        </span>
                      </div>
                      <div className="h-8 w-px bg-slate-700" />
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">สถานะเข้างาน</span>
                        <span className={`text-xs font-bold block ${
                          selectedTicketSeat.checkedIn ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {selectedTicketSeat.checkedIn ? '✓ เข้างานแล้ว' : 'รอ Check-in'}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-300 space-y-0.5 pt-1">
                      <div className="flex items-center gap-1.5 text-amber-200">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-semibold">วันจัดงาน: 21 ธันวาคม 2569</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>เวลา: 16.30–20.00 น. (ประตูกลางเปิด 16.00 น.)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        <span>สถานที่: ห้องแกรนด์บอลรูม โรงแรมราชาวดี ขอนแก่น</span>
                      </div>
                    </div>
                  </div>

                  {/* QR Code Section */}
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-900/90 rounded-2xl border border-amber-500/30 text-center shrink-0">
                    <div className="w-28 h-28 bg-white p-2 rounded-xl mb-2 flex items-center justify-center shadow-md">
                      <div className="w-full h-full bg-[repeating-conic-gradient(#000000_0_25%,#ffffff_0_50%)] [background-size:10px_10px]" />
                    </div>
                    <div className="font-mono text-xs text-amber-300 font-bold tracking-wider">
                      {selectedTicketSeat.ticketCode || `GRAD69-${selectedTicketSeat.table}${selectedTicketSeat.seat}`}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      QR สแกนเช็คอินเข้างาน
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="no-print mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onToggleCheckIn(selectedTicketSeat.table, selectedTicketSeat.seat)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedTicketSeat.checkedIn
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {selectedTicketSeat.checkedIn ? 'ยกเลิกสถานะ Check-in' : 'กดบันทึก Check-in ทันที'}
                  </span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEmailModalSeat(selectedTicketSeat)}
                    className="px-4 py-2.5 bg-sky-950 hover:bg-sky-900 text-sky-200 border border-sky-600/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-sky-400" />
                    <span>ส่งบัตรทางอีเมล & เตือน 1 วัน</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTicketSeat(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
                  >
                    ปิดหน้าต่าง
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      // Trigger browser print window specifically for this ticket
                      window.print();
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all transform hover:scale-102 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-slate-950" />
                    <span>พิมพ์บัตร (Print Preview)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Dispatch Modal */}
      {emailModalSeat && (
        <EmailTicketModal
          isOpen={!!emailModalSeat}
          onClose={() => setEmailModalSeat(null)}
          guestName={emailModalSeat.guestName}
          category={
            emailModalSeat.category === 'faculty'
              ? 'คณาจารย์ / ผู้บริหาร'
              : emailModalSeat.category === 'graduate'
              ? 'บัณฑิตพยาบาลศาสตร์'
              : 'แขกผู้มีเกียรติ'
          }
          table={emailModalSeat.table}
          seat={emailModalSeat.seat}
          ticketCode={emailModalSeat.ticketCode || `GRAD69-${emailModalSeat.table}${emailModalSeat.seat}`}
          tableName={TABLES.find(t => t.id === emailModalSeat.table)?.name}
        />
      )}
    </div>
  );
};
