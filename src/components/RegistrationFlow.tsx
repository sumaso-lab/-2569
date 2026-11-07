import React, { useState } from 'react';
import {
  User,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Upload,
  ArrowRight,
  ArrowLeft,
  Printer,
  Copy,
  Check,
  QrCode,
  Sparkles,
  Mail,
  PhoneCall,
  ExternalLink,
  Eye,
  Clock,
  X,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import {
  GuestInfo,
  SeatAssignment,
  ExistingSeat,
  TableConfig,
  AttendeeCategory,
  ReservationRecord
} from '../types';
import { TABLES } from '../data/initialData';
import { KKUNursingLogo } from './KKUNursingLogo';
import { ChineseBanquetTable } from './ChineseBanquetTable';
import { EmailTicketModal } from './EmailTicketModal';
import { DigitalPassCard } from './DigitalPassCard';
import { generateRealisticSlipDataUrl } from '../utils/slipGenerator';

interface RegistrationFlowProps {
  existingSeats: ExistingSeat[];
  onSaveReservation: (record: ReservationRecord) => Promise<void>;
  seatsReady: boolean;
  onViewAdmin: () => void;
  onViewFloorPlan: () => void;
}

const TICKET_PRICE = 799;

export const RegistrationFlow: React.FC<RegistrationFlowProps> = ({
  existingSeats,
  onSaveReservation,
  seatsReady,
  onViewAdmin,
  onViewFloorPlan
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form States - Step 1
  const [bookerName, setBookerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<AttendeeCategory>('graduate');
  const [academicYear, setAcademicYear] = useState('รุ่น 2569');
  const [guestCount, setGuestCount] = useState<number>(2);

  // Individual guests state
  const [guests, setGuests] = useState<GuestInfo[]>([
    { id: '1', name: '', category: 'graduate' },
    { id: '2', name: '', category: 'guest' }
  ]);

  // Step 2: Payment
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [verifyConfirmed, setVerifyConfirmed] = useState(false);
  const [slipError, setSlipError] = useState('');
  const [saving, setSaving] = useState(false);

  // Step 4: Seat Assignment
  const [selectedTableId, setSelectedTableId] = useState<number>(1);
  const [assignments, setAssignments] = useState<Record<number, SeatAssignment>>({});
  const [activeGuestSelectIndex, setActiveGuestSelectIndex] = useState<number>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Completed reservation record
  const [confirmedReservation, setConfirmedReservation] = useState<ReservationRecord | null>(null);
  const [previewModalSlipUrl, setPreviewModalSlipUrl] = useState<string | null>(null);
  const [emailModalGuest, setEmailModalGuest] = useState<{
    guestName: string;
    category: string;
    table: number;
    seat: number;
    ticketCode: string;
    email?: string;
  } | null>(null);

  // Helper to handle guest count changes (max 8 per table)
  const handleGuestCountChange = (newCount: number) => {
    const validCount = Math.max(1, Math.min(8, newCount));
    setGuestCount(validCount);

    setGuests(prev => {
      const updated: GuestInfo[] = [];
      for (let i = 0; i < validCount; i++) {
        if (prev[i]) {
          updated.push(prev[i]);
        } else {
          updated.push({
            id: String(i + 1),
            name: i === 0 ? bookerName : `ผู้ร่วมงาน ${i + 1}`,
            category: i === 0 ? category : 'guest'
          });
        }
      }
      return updated;
    });

    // Reset assignments if count reduced
    setAssignments(prev => {
      const copy = { ...prev };
      Object.keys(copy).forEach(k => {
        if (Number(k) >= validCount) {
          delete copy[Number(k)];
        }
      });
      return copy;
    });
  };

  const handleUpdateGuestName = (index: number, name: string) => {
    setGuests(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], name };
      }
      return copy;
    });
    if (index === 0) {
      setBookerName(name);
    }
  };

  // Local slip preview only; payment must be independently verified by the organizer
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setSlipError('ไฟล์ต้องมีขนาดไม่เกิน 10MB'); return; }
    setSlipFile(file);
    setSlipError('');

    const reader = new FileReader();
    reader.onload = () => {
      setSlipPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleStep2Submit = () => {
    if (!slipFile && !slipPreview) {
      setSlipError('กรุณาอัปโหลดหลักฐานการโอนเงิน (สลิปโอน)');
      return;
    }
    if (!verifyConfirmed) {
      setSlipError('กรุณากดยืนยันว่าข้อมูลและยอดชำระถูกต้อง');
      return;
    }
    setSlipError('');
    setCurrentStep(3);
  };

  // Occupancy helper for table
  const getTableOccupancy = (tableId: number) => {
    const presetCount = existingSeats.filter(s => s.table === tableId).length;
    const currentBookingCount = Object.values(assignments).filter(a => a.table === tableId).length;
    return presetCount + currentBookingCount;
  };

  // Check if seat is taken
  const getSeatStatus = (tableId: number, seatNum: number) => {
    const preset = existingSeats.find(s => s.table === tableId && s.seat === seatNum);
    if (preset) {
      return { taken: true, guestName: preset.guestName, category: preset.category };
    }
    const myAssignmentEntry = Object.entries(assignments).find(
      ([, a]) => a.table === tableId && a.seat === seatNum
    );
    if (myAssignmentEntry) {
      const guestIndex = Number(myAssignmentEntry[0]);
      return {
        isMine: true,
        guestIndex,
        guestName: guests[guestIndex]?.name || `ท่านที่ ${guestIndex + 1}`
      };
    }
    return { available: true };
  };

  // Choose or toggle seat
  const handleSeatClick = (tableId: number, seatNum: number) => {
    const status = getSeatStatus(tableId, seatNum);

    // If taken by other existing guest
    if (status.taken) return;

    // If it's already assigned to one of our guests, remove that assignment
    if (status.isMine && status.guestIndex !== undefined) {
      setAssignments(prev => {
        const copy = { ...prev };
        delete copy[status.guestIndex!];
        return copy;
      });
      return;
    }

    // Find first guest in our party who does not have a seat yet, or use activeGuestSelectIndex
    let targetIndex = activeGuestSelectIndex;
    if (assignments[targetIndex]) {
      // Find another unseated guest
      const unassignedIdx = guests.findIndex((_, idx) => !assignments[idx]);
      if (unassignedIdx !== -1) {
        targetIndex = unassignedIdx;
        setActiveGuestSelectIndex(unassignedIdx);
      }
    }

    setAssignments(prev => ({
      ...prev,
      [targetIndex]: { table: tableId, seat: seatNum }
    }));

    // Auto-advance active guest to the next unseated member
    const nextUnassigned = guests.findIndex((_, idx) => idx !== targetIndex && !assignments[idx]);
    if (nextUnassigned !== -1) {
      setActiveGuestSelectIndex(nextUnassigned);
    }
  };

  // Confirm reservation and generate tickets
  const handleConfirmReservation = async () => {
    if (saving || !seatsReady) return;
    if (!bookerName.trim() || guests.some(g => !g.name.trim())) { alert('กรุณากรอกชื่อผู้จองและผู้ร่วมงานให้ครบ'); return; }
    // Check all guests have seats
    const allAssigned = guests.every((_, idx) => !!assignments[idx]);
    if (!allAssigned) {
      alert('กรุณาเลือกเก้าอี้และโต๊ะให้ครบทุกคนในกลุ่ม');
      return;
    }

    const reservationId = 'RES-' + crypto.randomUUID();
    const timestamp = new Date().toLocaleString('th-TH');

    const updatedGuests = guests.map((g, idx) => {
      const code = `GRAD69-${tableNumberPad(assignments[idx].table)}${seatNumberPad(assignments[idx].seat)}${Math.floor(10 + Math.random() * 90)}`;
      return {
        ...g,
        ticketCode: code
      };
    });

    const effectiveSlipUrl = slipPreview || generateRealisticSlipDataUrl({
      payerName: bookerName,
      amount: guestCount * TICKET_PRICE,
      timestamp
    });

    const record: ReservationRecord = {
      id: reservationId,
      mainBooker: bookerName,
      phone,
      email,
      category,
      academicYear,
      guestCount,
      guests: updatedGuests,
      assignments,
      totalAmount: guestCount * TICKET_PRICE,
      slipFileName: slipFile?.name || 'slip.jpg',
      slipUrl: effectiveSlipUrl,
      slipTimestamp: timestamp,
      status: 'pending', // Waiting for staff approval
      createdAt: timestamp
    };

    setSaving(true);
    try {
      await onSaveReservation(record);
      setConfirmedReservation(record);
      setCurrentStep(4);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'บันทึกการจองไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  const copyTicketCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const tableNumberPad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const seatNumberPad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  return (
    <div className="max-w-5xl mx-auto mb-16">
      {/* 4-Step Progress Indicators */}
      <div className="no-print bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 sm:p-6 mb-8 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {[
            { step: 1, label: '1. ข้อมูลผู้ร่วมงาน' },
            { step: 2, label: '2. ชำระเงิน & สลิป' },
            { step: 3, label: '3. เลือกโต๊ะ & ที่นั่ง' },
            { step: 4, label: '4. รอเจ้าหน้าที่อนุมัติ' }
          ].map((item, i, arr) => (
            <React.Fragment key={item.step}>
              <div className="flex flex-col items-center">
                <button
                  onClick={() => {
                    // Only allow going backwards or to step 4 if confirmed
                    if (item.step < currentStep || (item.step === 4 && confirmedReservation)) {
                      setCurrentStep(item.step);
                    }
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    currentStep === item.step
                      ? 'bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 ring-4 ring-amber-400/20 shadow-lg'
                      : currentStep > item.step
                      ? 'bg-emerald-500 text-white cursor-pointer hover:bg-emerald-600'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {currentStep > item.step ? <Check className="w-5 h-5 stroke-[3]" /> : item.step}
                </button>
                <span
                  className={`text-[11px] sm:text-xs mt-2 text-center whitespace-nowrap font-medium ${
                    currentStep === item.step
                      ? 'text-amber-300 font-semibold'
                      : currentStep > item.step
                      ? 'text-emerald-400'
                      : 'text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </div>

              {i < arr.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 sm:mx-4 transition-all ${
                    currentStep > item.step ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ================= STEP 1: ATTENDEE FORM ================= */}
      {currentStep === 1 && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-amber-500/30 shadow-xl shadow-slate-900/5">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
            <div>
              <div className="text-xs font-semibold text-amber-700 tracking-wider uppercase mb-1">
                STEP 01 — ATTENDEE REGISTRATION
              </div>
              <h2 className="font-serif-thai text-2xl sm:text-3xl font-bold text-slate-900">
                1. ลงทะเบียนผู้เข้าร่วมงานฉลองบัณฑิต
              </h2>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <User className="w-6 h-6" />
            </div>
          </div>

          <div className="space-y-6">
            {/* Primary Booker Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  ชื่อ–นามสกุล ผู้ทำการจอง <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={bookerName}
                    onChange={e => {
                      setBookerName(e.target.value);
                      handleUpdateGuestName(0, e.target.value);
                    }}
                    placeholder="เช่น นางสาวกีรณา วงศ์พัฒนกิจ"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-slate-800 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  เบอร์โทรศัพท์ติดต่อ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="08x-xxx-xxxx"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-slate-800 font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  อีเมล (สำหรับส่งบัตรเข้างาน)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@university.ac.th"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none text-slate-800"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  ประเภทผู้เข้าร่วม
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as AttendeeCategory)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none text-slate-800 bg-white"
                >
                  <option value="graduate">บัณฑิต / มหาบัณฑิต</option>
                  <option value="faculty">คณาจารย์ / ผู้บริหาร</option>
                  <option value="guest">แขกร่วมงาน / ญาติบัณฑิต</option>
                </select>
              </div>
            </div>

            {/* Guest Count Selector */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900 text-base">
                    จำนวนผู้เข้าร่วมทั้งหมดในกลุ่มนี้
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    อัตราค่าลงทะเบียนท่านละ 799 บาท (สูงสุด 8 ท่านต่อกลุ่ม/โต๊ะ) · สอบถามเพิ่มเติม: 0951864940
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-amber-300 bg-white rounded-xl overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => handleGuestCountChange(guestCount - 1)}
                      disabled={guestCount <= 1}
                      className="px-4 py-2 bg-amber-100 hover:bg-amber-200 disabled:opacity-40 text-amber-900 font-bold transition-colors"
                    >
                      -
                    </button>
                    <span className="px-5 py-2 font-bold text-slate-900 text-lg tabular-nums">
                      {guestCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleGuestCountChange(guestCount + 1)}
                      disabled={guestCount >= 8}
                      className="px-4 py-2 bg-amber-100 hover:bg-amber-200 disabled:opacity-40 text-amber-900 font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-amber-900">ท่าน</span>
                </div>
              </div>

              {/* Total Calculation summary box */}
              <div className="mt-4 pt-3 border-t border-amber-200/80 flex items-center justify-between text-sm">
                <span className="text-slate-700">ยอดรวมค่าลงทะเบียน ({guestCount} × 799 บาท):</span>
                <span className="text-xl font-bold text-amber-800 tabular-nums">
                  {(guestCount * TICKET_PRICE).toLocaleString('th-TH')} บาท
                </span>
              </div>
            </div>

            {/* Individual Guest Names */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 text-base">
                  ระบุชื่อสำหรับผู้เข้าร่วมแต่ละคน
                </h3>
                <span className="text-xs text-slate-500">
                  (ชื่อจะแสดงบนบัตรเข้างานและป้ายประจำที่นั่ง)
                </span>
              </div>

              <div className="space-y-3">
                {guests.map((g, idx) => (
                  <div
                    key={g.id || idx}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="w-20 text-xs font-bold text-slate-500 shrink-0">
                      ท่านที่ {idx + 1}
                    </div>

                    <div className="flex-1">
                      <input
                        type="text"
                        value={g.name}
                        onChange={e => handleUpdateGuestName(idx, e.target.value)}
                        placeholder={`ชื่อ–นามสกุล ท่านที่ ${idx + 1}`}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Step Action */}
            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!bookerName.trim()) {
                    alert('กรุณากรอกชื่อ–นามสกุลผู้จอง');
                    return;
                  }
                  if (!phone.trim()) {
                    alert('กรุณากรอกเบอร์โทรศัพท์ติดต่อ');
                    return;
                  }
                  setCurrentStep(2);
                }}
                className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-600/20 transition-all flex items-center gap-2"
              >
                <span>ดำเนินการชำระเงิน</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 2: PAYMENT & SLIP ================= */}
      {currentStep === 2 && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-amber-500/30 shadow-xl shadow-slate-900/5">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
            <div>
              <div className="text-xs font-semibold text-amber-700 tracking-wider uppercase mb-1">
                STEP 02 — PAYMENT & PROOF OF TRANSFER
              </div>
              <h2 className="font-serif-thai text-2xl sm:text-3xl font-bold text-slate-900">
                2. ชำระค่าลงทะเบียนและยืนยันสลิป
              </h2>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Payment Summary & Bank Details */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white border border-amber-500/30 shadow-xl">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs tracking-wider text-amber-300 font-semibold uppercase">
                      ยอดชำระสุทธิ
                    </span>
                    <div className="text-4xl font-bold text-amber-300 mt-1 font-serif-thai tabular-nums">
                      {(guestCount * TICKET_PRICE).toLocaleString('th-TH')}{' '}
                      <span className="text-lg text-slate-300 font-sans font-normal">บาท</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-medium border border-amber-500/30">
                    {guestCount} ท่าน (799 บ./คน)
                  </span>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-slate-800 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">ธนาคาร:</span>
                    <span className="font-medium text-slate-100">ธนาคารกรุงไทย (Krungthai)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ชื่อบัญชี:</span>
                    <span className="font-medium text-slate-100">โครงการยินดีบัณฑิต</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">เลขที่บัญชี:</span>
                    <span className="font-mono text-base font-bold text-amber-200 tracking-wider">
                      รอผู้จัดงานยืนยันบัญชี
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ผู้จอง:</span>
                    <span className="text-slate-200">{bookerName}</span>
                  </div>
                </div>
              </div>

              {/* PromptPay QR Code Mock with scan instructions */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 text-center">
                <span className="text-xs font-semibold text-slate-600 block mb-3">
                  QR ด้านล่างเป็นภาพประกอบ ไม่สามารถใช้ชำระเงินได้
                </span>
                <div className="inline-block p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  {/* Generated QR Code styling */}
                  <div className="w-40 h-40 bg-slate-900 p-2 rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="w-full h-full bg-[radial-gradient(#ffffff_2px,transparent_2px)] [background-size:8px_8px] opacity-80" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-white p-1 shadow flex items-center justify-center">
                        <QrCode className="w-6 h-6 text-slate-900" />
                      </div>
                      <span className="text-[10px] text-amber-300 font-bold mt-1 bg-slate-950/80 px-2 py-0.5 rounded">
                        ฿{guestCount * TICKET_PRICE}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  โปรดอย่าโอนเงินผ่านภาพ QR ตัวอย่างนี้
                </p>
              </div>
            </div>

            {/* Slip Upload Box */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  อัปโหลดหลักฐานการโอนเงิน (สลิปโอนเงิน) <span className="text-rose-500">*</span>
                </label>

                <div className="relative border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-3xl p-6 text-center bg-amber-50/30 transition-all">
                  {slipPreview ? (
                    <div className="space-y-3">
                      <img
                        src={slipPreview}
                        alt="สลิปโอนเงิน"
                        className="max-h-56 mx-auto rounded-xl shadow-md border border-slate-200 object-contain"
                      />
                      <div className="text-xs text-emerald-700 font-semibold flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>แนบสลิปเรียบร้อยแล้ว: {slipFile?.name || 'slip.jpg'}</span>
                      </div>
                      <label className="inline-block text-xs text-amber-700 underline cursor-pointer hover:text-amber-900">
                        <span>เปลี่ยนรูปสลิป</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="py-8 space-y-3">
                      <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                        <Upload className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
                        </p>
                        <p className="text-xs text-slate-500 mt-1">รองรับ JPG, PNG, PDF ขนาดไม่เกิน 10MB</p>
                      </div>
                      <label className="inline-block px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold cursor-pointer hover:bg-slate-50 shadow-sm transition-all">
                        <span>เลือกไฟล์จากเครื่อง</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>

              </div>

              {/* Confirmation checkbox */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verifyConfirmed}
                    onChange={e => setVerifyConfirmed(e.target.checked)}
                    className="mt-1 w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                  />
                  <span className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    ข้าพเจ้ายืนยันว่าข้อมูลผู้เข้าร่วมงานและยอดเงินที่ชำระถูกต้องครบถ้วนตามความจริง
                    และยินยอมให้คณะผู้จัดงานนำข้อมูลไปจัดทำบัตรและผังที่นั่ง
                  </span>
                </label>
              </div>

              {slipError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{slipError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ย้อนกลับไปแก้ไขข้อมูล</span>
            </button>

            <button
              type="button"
              onClick={handleStep2Submit}
              className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>ถัดไป: เลือกโต๊ะและที่นั่ง</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: TABLE & SEAT SELECTION ================= */}
      {currentStep === 3 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-500/30 shadow-xl shadow-slate-900/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4 mb-6">
            <div>
              <div className="text-xs font-semibold text-amber-700 tracking-wider uppercase mb-1">
                STEP 03 — INTERACTIVE TABLE & SEAT ASSIGNMENT
              </div>
              <h2 className="font-serif-thai text-2xl sm:text-3xl font-bold text-slate-900">
                3. เลือกโต๊ะและที่นั่งรายบุคคล
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                คลิกเลือกโต๊ะที่ต้องการ จากนั้นคลิกเก้าอี้ว่างเพื่อระบุผู้เข้าร่วมแต่ละคน
              </p>
            </div>

            {/* Quick Summary of remaining seats to assign */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs">
              <span className="text-slate-600 block">จัดที่นั่งแล้ว:</span>
              <span className="text-base font-bold text-amber-900">
                {Object.keys(assignments).length} / {guestCount} ท่าน
              </span>
            </div>
          </div>

          {/* STAGE INDICATION (Front of Ballroom) */}
          <div className="mb-6 p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-amber-200 text-center border border-amber-500/30 shadow-inner">
            <span className="text-xs font-bold tracking-widest uppercase">
              ✦ เวทีพิธีการหลัก / MAIN COMMENCEMENT STAGE ✦
            </span>
          </div>

          {/* TABLE SELECTOR (15 Tables Grid) */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-slate-800 text-sm">
                เลือกโต๊ะจัดเลี้ยง (ทั้งหมด 15 โต๊ะ)
              </h3>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" /> ว่าง
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500" /> โต๊ะที่คุณเลือก
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-400" /> เต็มแล้ว
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {TABLES.map(t => {
                const occ = getTableOccupancy(t.id);
                const isFull = occ >= t.capacity;
                const isSelected = selectedTableId === t.id;
                const myCountInThisTable = Object.values(assignments).filter(a => a.table === t.id).length;

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTableId(t.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-400 shadow-md'
                        : isFull
                        ? 'border-rose-200 bg-rose-50/60 text-slate-600'
                        : 'border-slate-200 hover:border-amber-400 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="font-bold text-sm text-slate-900">โต๊ะ {t.id}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          isFull
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isFull ? 'เต็ม' : `ว่าง ${t.capacity - occ}`}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 truncate mb-1">
                      {t.name}
                    </div>

                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          isFull ? 'bg-rose-500' : isSelected ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${(occ / t.capacity) * 100}%` }}
                      />
                    </div>

                    {myCountInThisTable > 0 && (
                      <div className="mt-2 text-[10px] text-amber-800 font-bold bg-amber-100/80 px-2 py-0.5 rounded-md inline-block">
                        กลุ่มคุณเลือก {myCountInThisTable} ที่
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ACTIVE TABLE DETAIL & SEAT MAP */}
          <div className="p-6 rounded-3xl bg-slate-900 text-white border border-amber-500/30 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-6">
              <div>
                <div className="text-xs text-amber-300 font-semibold uppercase tracking-wider">
                  ผังที่นั่งประจำโต๊ะ
                </div>
                <h3 className="font-serif-thai text-xl sm:text-2xl font-bold text-amber-100">
                  {TABLES.find(t => t.id === selectedTableId)?.name} (โต๊ะ {selectedTableId})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {TABLES.find(t => t.id === selectedTableId)?.description}
                </p>
              </div>

              {/* Guest selector active tab */}
              <div className="bg-slate-800/90 p-2 rounded-xl border border-slate-700">
                <span className="text-[11px] text-slate-400 block mb-1">
                  กำลังเลือกเก้าอี้ให้ผู้ร่วมงาน:
                </span>
                <select
                  value={activeGuestSelectIndex}
                  onChange={e => setActiveGuestSelectIndex(Number(e.target.value))}
                  className="bg-slate-900 text-amber-300 font-semibold text-xs px-2.5 py-1.5 rounded-lg border border-amber-500/40 outline-none w-full"
                >
                  {guests.map((g, idx) => (
                    <option key={idx} value={idx}>
                      คนที่ {idx + 1}: {g.name}{' '}
                      {assignments[idx]
                        ? `(โต๊ะ ${assignments[idx].table} ที่ ${assignments[idx].seat})`
                        : '(ยังไม่มีที่นั่ง)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Chinese Banquet Table 8-person view with names directly */}
            <div className="mb-6">
              <div className="text-xs text-slate-400 mb-3 text-center sm:text-left">
                คลิกที่เก้าอี้ว่างเพื่อกำหนดที่นั่งให้ {guests[activeGuestSelectIndex]?.name || `คนที่ ${activeGuestSelectIndex + 1}`} หรือคลิกที่นั่งสีทองเพื่อยกเลิก
              </div>

              {(() => {
                const selectedTableConfig = TABLES.find(t => t.id === selectedTableId) || TABLES[0];
                const combinedSeatsForBanquet: ExistingSeat[] = [
                  ...existingSeats,
                  ...Object.entries(assignments).map(([gIdx, assign]) => ({
                    table: assign.table,
                    seat: assign.seat,
                    guestName: guests[Number(gIdx)]?.name || `ท่านที่ ${Number(gIdx) + 1}`,
                    category: guests[Number(gIdx)]?.category || 'graduate',
                    ticketCode: `PENDING-${assign.table}${assign.seat}`,
                    checkedIn: false
                  }))
                ];
                const mySeatNumbersInThisTable = Object.values(assignments)
                  .filter(a => a.table === selectedTableId)
                  .map(a => a.seat);

                return (
                  <ChineseBanquetTable
                    table={selectedTableConfig}
                    seats={combinedSeatsForBanquet}
                    mySeatNumbers={mySeatNumbersInThisTable}
                    interactive={true}
                    onSelectSeat={(seatNum) => handleSeatClick(selectedTableId, seatNum)}
                  />
                );
              })()}
            </div>

            {/* Seating roster of your party */}
            <div className="pt-4 border-t border-slate-800">
              <div className="text-xs font-semibold text-amber-300 mb-2">
                สถานะการจัดที่นั่งในกลุ่มคุณ ({Object.keys(assignments).length} จาก {guestCount} ท่าน)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {guests.map((g, idx) => {
                  const assign = assignments[idx];
                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveGuestSelectIndex(idx)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                        activeGuestSelectIndex === idx
                          ? 'border-amber-400 bg-amber-500/20 text-white font-semibold'
                          : assign
                          ? 'border-slate-700 bg-slate-800/60 text-slate-300'
                          : 'border-dashed border-rose-500/60 bg-rose-950/20 text-rose-300'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <span className="font-bold text-amber-200">
                          {idx + 1}. {g.name}
                        </span>
                      </div>
                      <div className="shrink-0 text-right">
                        {assign ? (
                          <span className="px-2 py-0.5 bg-amber-400 text-slate-950 rounded font-bold">
                            T{assign.table} · S{assign.seat}
                          </span>
                        ) : (
                          <span className="text-[10px] text-rose-400">ยังไม่เลือก</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Validation & Submit Button */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              {Object.keys(assignments).length === guestCount ? (
                <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  เลือกที่นั่งครบทุกท่านแล้ว พร้อมออกบัตรเข้างาน
                </span>
              ) : (
                <span className="text-amber-700 font-medium">
                  กรุณาจัดที่นั่งให้ครบทั้ง {guestCount} ท่าน (ขาดอีก {guestCount - Object.keys(assignments).length} ท่าน)
                </span>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
              >
                ย้อนกลับ
              </button>

              <button
                type="button"
                onClick={handleConfirmReservation}
                disabled={saving || !seatsReady || Object.keys(assignments).length !== guestCount}
                className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-amber-600/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{saving ? 'กำลังตรวจสอบและบันทึก...' : 'ยืนยันการจองและส่งหลักฐาน (รอตรวจสลิป)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 4: DIGITAL TICKETS & WAITING FOR APPROVAL ================= */}
      {currentStep === 4 && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Status Banner */}
          <div className="no-print bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border-2 border-amber-400/50 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-400/30">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>สถานะ: รอเจ้าหน้าที่อนุมัติหลังตรวจสอบ (PENDING APPROVAL)</span>
                </div>
                <h2 className="font-serif-thai text-2xl sm:text-3xl font-bold text-amber-100">
                  สำรองที่นั่งเรียบร้อยแล้ว · รอเจ้าหน้าที่ตรวจสอบสลิปและอนุมัติ
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  ระบบได้ทำการล็อคตำแหน่งที่นั่งสำหรับทั้ง <strong className="text-amber-300">{guestCount} ท่าน</strong> ไว้เรียบร้อยแล้ว ขณะนี้อยู่ระหว่างการตรวจสอบความถูกต้องของสลิปโอนเงินโดยเจ้าหน้าที่ เมื่อได้รับการอนุมัติแล้ว ท่านจะสามารถนำบัตรดิจิทัลเข้างานได้ทันที
                </p>
              </div>

              <div className="shrink-0 flex flex-wrap gap-2">
                {confirmedReservation?.slipUrl && (
                  <button
                    type="button"
                    onClick={() => setPreviewModalSlipUrl(confirmedReservation.slipUrl!)}
                    className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-amber-400" />
                    <span>เปิดดูสลิปที่แนบมา</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onViewAdmin}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>ช่องระบบเจ้าหน้าที่</span>
                </button>
              </div>
            </div>

            {/* Booking Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">รหัสการจอง</span>
                <span className="font-mono text-xs sm:text-sm font-bold text-amber-300 truncate block">{confirmedReservation?.id}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">ผู้จองหลัก</span>
                <span className="font-bold text-sm text-white truncate block">{bookerName}</span>
                <span className="text-[10px] text-slate-400">{phone}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">ยอดชำระ ({guestCount} ท่าน)</span>
                <span className="font-serif-thai text-base font-bold text-amber-300 tabular-nums">
                  {(guestCount * TICKET_PRICE).toLocaleString('th-TH')} บาท
                </span>
                <span className="text-[10px] text-emerald-400 block">อัตราท่านละ 799 บ.</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">หลักฐานสลิป</span>
                {confirmedReservation?.slipUrl ? (
                  <button
                    type="button"
                    onClick={() => setPreviewModalSlipUrl(confirmedReservation.slipUrl!)}
                    className="text-xs font-bold text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>คลิกดูสลิปที่แนบมา</span>
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">แนบสลิปแล้ว</span>
                )}
                <span className="text-[10px] text-amber-400/80 block mt-0.5">รอเจ้าหน้าที่ตรวจ</span>
              </div>
            </div>
            {/* Action buttons inside status banner */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const firstGuest = guests[0];
                  const firstAssign = assignments[0];
                  setEmailModalGuest({
                    guestName: bookerName,
                    category:
                      category === 'faculty'
                        ? 'คณาจารย์ / ผู้บริหาร'
                        : category === 'graduate'
                        ? 'มหาบัณฑิตพยาบาลศาสตร์'
                        : 'แขกผู้มีเกียรติ',
                    table: firstAssign?.table || 1,
                    seat: firstAssign?.seat || 1,
                    ticketCode: firstGuest?.ticketCode || `GRAD69-0101`,
                    email
                  });
                }}
                className="px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-950/20 flex items-center gap-2 text-sm transition-all cursor-pointer"
              >
                <Mail className="w-4 h-4 text-slate-950" />
                <span>ส่งบัตรเข้างานไปที่อีเมล & ตั้งเตือน 1 วัน</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-6 py-3 bg-white text-slate-900 font-bold rounded-xl shadow hover:bg-slate-100 transition-all flex items-center gap-2 text-sm cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-700" />
                <span>พิมพ์ / บันทึกเอกสาร PDF</span>
              </button>

              <button
                type="button"
                onClick={onViewFloorPlan}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-amber-200 font-semibold rounded-xl border border-slate-700 transition-all text-sm cursor-pointer"
              >
                <span>ดูตำแหน่งโต๊ะในผัง 12 โต๊ะ</span>
              </button>
            </div>
          </div>

          {/* PRINT AREA: Individual High-Fidelity Tickets */}
          <div className="print-area space-y-6">
            {guests.map((g, idx) => {
              const assign = assignments[idx];
              const ticketCode = g.ticketCode || `GRAD69-${tableNumberPad(assign?.table || 1)}${seatNumberPad(assign?.seat || 1)}${idx + 10}`;

              return (
                <article
                  key={idx}
                  className="ticket-card relative bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl border border-amber-500/40 shadow-2xl shadow-slate-950/60 overflow-hidden"
                >
                  {/* Decorative Ticket Punch Out Notches */}
                  <div className="absolute top-1/2 -left-4 w-8 h-8 rounded-full bg-slate-50 border-r border-amber-500/40 -translate-y-1/2 z-20 hidden sm:block" />
                  <div className="absolute top-1/2 -right-4 w-8 h-8 rounded-full bg-slate-50 border-l border-amber-500/40 -translate-y-1/2 z-20 hidden sm:block" />

                  {/* Header Strip */}
                  <div className="px-6 py-4 bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-b border-amber-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <KKUNursingLogo size="sm" />
                      <div>
                        <span className="font-serif-thai font-bold text-amber-200 text-sm tracking-wide block">
                          ยินดีบัณฑิตพยาบาล มข. ๒๕๖๙ · FACULTY OF NURSING KKU
                        </span>
                        <span className="text-[10px] text-slate-400">
                          คณะพยาบาลศาสตร์ มหาวิทยาลัยขอนแก่น · OFFICIAL INVITATION PASS
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>รอเจ้าหน้าที่อนุมัติ</span>
                      </span>
                      <span className="px-3 py-1 bg-amber-500/20 text-amber-300 font-mono text-xs rounded-full border border-amber-500/40 font-bold">
                        {ticketCode}
                      </span>
                    </div>
                  </div>

                  {/* Ticket Body */}
                  <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Guest & Seat Highlight */}
                    <div className="md:col-span-8 space-y-4">
                      <div>
                        <span className="text-xs text-amber-400 uppercase tracking-wider font-semibold">
                          ชื่อผู้เข้าร่วมงาน (ATTENDEE NAME)
                        </span>
                        <h3 className="font-serif-thai text-2xl sm:text-3xl font-bold text-white mt-0.5">
                          {g.name}
                        </h3>
                        <div className="text-xs text-slate-400 mt-1">
                          <span>
                            {g.category === 'faculty'
                              ? 'คณาจารย์ / ผู้บริหาร'
                              : g.category === 'graduate'
                              ? 'บัณฑิตผู้สำเร็จการศึกษา'
                              : 'แขกผู้มีเกียรติ'}
                          </span>
                        </div>
                      </div>

                      {/* Prominent Table & Seat Badge */}
                      <div className="inline-flex items-center gap-4 p-4 rounded-2xl bg-slate-900 border border-amber-500/40 shadow-inner">
                        <div>
                          <span className="block text-[11px] text-slate-400 uppercase">หมายเลขโต๊ะ</span>
                          <span className="font-serif-thai text-2xl sm:text-3xl font-bold text-amber-300">
                            โต๊ะ {assign?.table || 1}
                          </span>
                        </div>
                        <div className="h-8 w-px bg-slate-700" />
                        <div>
                          <span className="block text-[11px] text-slate-400 uppercase">หมายเลขเก้าอี้</span>
                          <span className="font-serif-thai text-2xl sm:text-3xl font-bold text-amber-300">
                            เก้าอี้ที่ {assign?.seat || 1}
                          </span>
                        </div>
                        <div className="h-8 w-px bg-slate-700" />
                        <div>
                          <span className="block text-[11px] text-slate-400 uppercase">โซนที่นั่ง</span>
                          <span className="text-xs font-semibold text-slate-200">
                            {TABLES.find(t => t.id === assign?.table)?.zone || 'โซนจัดเลี้ยง'}
                          </span>
                        </div>
                      </div>

                      {/* Event schedule & Venue Details */}
                      <div className="text-xs text-slate-300 space-y-1.5">
                        <div>
                          <strong>วันจัดงาน:</strong> <span className="text-amber-300 font-semibold">21 ธันวาคม 2569</span> · 18.00–22.00 น.
                        </div>
                        <div>
                          <strong>สถานที่:</strong> โรงแรมราชาวดี ขอนแก่น (ห้องแกรนด์บอลรูม)
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                          <a
                            href="https://www.google.com/maps/place/Rachawadee+Khonkaen+Airport+Hotel/@16.460217,102.7838134,17z/data=!3m1!4b1!4m9!3m8!1s0x312261cbd71eca59:0xc4e42f5f77ff1dbe!5m2!4m1!1i2!8m2!3d16.460217!4d102.7863883!16s%2Fg%2F1tkb2l2h?entry=ttu&g_ep=EgoyMDI2MTAyOC4wIKXMDSoASAFQAw%3D%3D"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="no-print inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 text-amber-300 hover:text-white rounded-lg border border-amber-400/40 font-medium transition-colors"
                          >
                            <span>📍 แผนที่ Google Maps โรงแรมราชาวดี</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          <a
                            href="tel:0951864940"
                            className="inline-flex items-center gap-1 text-slate-300 hover:text-amber-300"
                          >
                            <PhoneCall className="w-3 h-3 text-amber-400" />
                            <span>สอบถามเพิ่มเติม: 0951864940</span>
                          </a>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          <strong>การแต่งกาย:</strong> ชุดครุยวิทยฐานะ / สูทสากล / ชุดผ้าไทยสุภาพ
                        </div>
                      </div>
                    </div>

                    {/* QR Code & Barcode Section */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-900/80 rounded-2xl border border-slate-800 text-center">
                      <div className="p-3 bg-white rounded-2xl border-4 border-amber-400 shadow-lg mb-2">
                        {/* High contrast QR Simulation */}
                        <div className="w-32 h-32 bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden p-1">
                          <div className="w-full h-full bg-[repeating-conic-gradient(#000000_0_25%,#ffffff_0_50%)] [background-size:12px_12px]" />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center shadow">
                              G69
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="font-mono text-xs text-amber-300 font-bold tracking-widest">
                        {ticketCode}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        แสดง QR Code นี้ ณ จุด Check-in
                      </span>

                      <div className="no-print w-full space-y-1.5 mt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEmailModalGuest({
                              guestName: g.name,
                              category:
                                g.category === 'faculty'
                                  ? 'คณาจารย์ / ผู้บริหาร'
                                  : g.category === 'graduate'
                                  ? 'มหาบัณฑิตพยาบาลศาสตร์'
                                  : 'แขกผู้มีเกียรติ',
                              table: assign?.table || 1,
                              seat: assign?.seat || 1,
                              ticketCode,
                              email: g.email || email
                            });
                          }}
                          className="w-full text-xs text-amber-200 hover:text-white flex items-center justify-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 rounded-lg border border-amber-400/40 transition-colors cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5 text-amber-400" />
                          <span>ส่งบัตรใบนี้ไปที่อีเมล & ตั้งเตือน</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => copyTicketCode(ticketCode, idx)}
                          className="w-full text-xs text-slate-300 hover:text-white flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg border border-slate-700 transition-colors"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">คัดลอกรหัสแล้ว</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>คัดลอกรหัสบัตร</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="no-print flex justify-center gap-4 pt-6">
            <button
              type="button"
              onClick={() => {
                // Reset for another registration
                setGuestCount(1);
                setAssignments({});
                setSlipFile(null);
                setSlipPreview(null);
                setCurrentStep(1);
              }}
              className="px-6 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              + ลงทะเบียนกลุ่มใหม่
            </button>
          </div>
        </div>
      )}

      {/* Email Dispatch Modal */}
      {emailModalGuest && (
        <EmailTicketModal
          isOpen={!!emailModalGuest}
          onClose={() => setEmailModalGuest(null)}
          guestName={emailModalGuest.guestName}
          category={emailModalGuest.category}
          table={emailModalGuest.table}
          seat={emailModalGuest.seat}
          ticketCode={emailModalGuest.ticketCode}
          defaultEmail={emailModalGuest.email || email}
          tableName={TABLES.find(t => t.id === emailModalGuest.table)?.name}
        />
      )}

      {/* Lightbox Modal: View Uploaded Slip in High Resolution */}
      {previewModalSlipUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-xl w-full border border-amber-500/40 p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-sm font-bold text-amber-200 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-amber-400" />
                <span>หลักฐานการโอนเงินที่แนบมา (สลิปโอนเงิน)</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalSlipUrl(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 flex justify-center">
              <img
                src={previewModalSlipUrl}
                alt="สลิปโอนเงิน"
                className="max-h-[70vh] rounded-2xl border border-slate-700 shadow-xl object-contain bg-white"
              />
            </div>
            <div className="pt-2 text-center text-xs text-slate-400">
              หลักฐานสลิปสำหรับตรวจสอบยอดโอน 799 บ./ท่าน
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
