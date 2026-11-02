import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Camera,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  Search,
  Users,
  LayoutGrid,
  CircleDot,
  Sparkles,
  RefreshCw,
  Volume2,
  VolumeX,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
  Award
} from 'lucide-react';
import { ExistingSeat, TableConfig } from '../types';
import { TABLES } from '../data/initialData';
import { KKUNursingLogo } from './KKUNursingLogo';
import { ChineseBanquetTable } from './ChineseBanquetTable';

interface CheckInScannerProps {
  existingSeats: ExistingSeat[];
  onToggleCheckIn: (table: number, seat: number) => void;
  onNavigateToFloorPlan?: () => void;
}

export const CheckInScanner: React.FC<CheckInScannerProps> = ({
  existingSeats,
  onToggleCheckIn,
  onNavigateToFloorPlan
}) => {
  // Scanner state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [lastScannedResult, setLastScannedResult] = useState<{
    seat: ExistingSeat;
    status: 'success' | 'already-checked' | 'not-found';
    timestamp: string;
  } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [hardwareScanFlash, setHardwareScanFlash] = useState<boolean>(false);
  const scannerBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // View mode for the seating overview ("เห็นทั้งหมดเหมือนลงทะเบียนจองที่นั่ง")
  const [viewTab, setViewTab] = useState<'tables' | 'banquet' | 'list'>('tables');
  const [selectedTableId, setSelectedTableId] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'checkedIn' | 'pending'>('all');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Play synthesized audio chime for check-in confirmation
  const playChime = (type: 'success' | 'warn' | 'error') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'success') {
        // High pleasant major chord chime
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.2); // G5
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else {
        // Warning dual tone
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(349.23, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch {
      // Audio autoplay restrictions
    }
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('อุปกรณ์หรือเบราว์เซอร์ไม่รองรับการเปิดกล้อง');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setCameraError('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตสิทธิ์กล้อง หรือใช้ช่องค้นหารหัสบัตรด้านล่างแทน');
      setIsCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Process a scanned or typed code
  const handleProcessCode = (rawInput: string) => {
    let code = rawInput.trim().toUpperCase();
    if (!code) return;

    // Check if input is a URL or query containing a ticket code (e.g. ?ticket=GRAD69-0101 or /ticket/GRAD69-0101)
    const ticketMatch = code.match(/GRAD69-[A-Z0-9]+/i);
    if (ticketMatch) {
      code = ticketMatch[0].toUpperCase();
    }

    const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    // Match by ticketCode, or substring of ticketCode, or by name match, or formatted table-seat (e.g. 1-2)
    const foundSeat = existingSeats.find(s => {
      const tCode = (s.ticketCode || `GRAD69-${s.table}${s.seat}`).toUpperCase();
      if (tCode === code) return true;
      if (code.includes(tCode)) return true;
      if (s.guestName.toUpperCase().includes(code)) return true;
      if (`${s.table}-${s.seat}` === code) return true;
      return false;
    });

    if (!foundSeat) {
      playChime('error');
      setLastScannedResult({
        seat: {
          table: 0,
          seat: 0,
          guestName: rawInput,
          category: 'guest',
          ticketCode: rawInput
        },
        status: 'not-found',
        timestamp: timeStr
      });
      return;
    }

    if (foundSeat.checkedIn) {
      playChime('warn');
      setLastScannedResult({
        seat: foundSeat,
        status: 'already-checked',
        timestamp: timeStr
      });
    } else {
      // Perform Check-in
      onToggleCheckIn(foundSeat.table, foundSeat.seat);
      playChime('success');
      setLastScannedResult({
        seat: { ...foundSeat, checkedIn: true },
        status: 'success',
        timestamp: timeStr
      });
    }

    setManualCode('');
  };

  // Global listener for USB / Bluetooth handheld barcode & QR scanner guns
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Barcode scanners terminate their string transmission with an Enter key
      if (e.key === 'Enter') {
        const buffer = scannerBufferRef.current.trim();
        if (buffer.length >= 3) {
          e.preventDefault();
          scannerBufferRef.current = '';
          setHardwareScanFlash(true);
          setTimeout(() => setHardwareScanFlash(false), 900);
          handleProcessCode(buffer);
          return;
        }
      }

      // Ignore modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey || e.key === 'Shift' || e.key === 'Tab') {
        return;
      }

      const activeEl = document.activeElement as HTMLElement | null;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
      const isScannerInput = activeEl && activeEl.id === 'scanner-manual-input';

      const now = Date.now();
      const elapsed = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Reset buffer if human delay is high (>220ms) and user is not focused on our input
      if (elapsed > 250 && !isScannerInput) {
        scannerBufferRef.current = '';
      }

      if (e.key.length === 1) {
        scannerBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      stopCamera();
    };
  }, [existingSeats]);

  // Metrics
  const totalOccupied = existingSeats.length;
  const checkedInCount = existingSeats.filter(s => s.checkedIn).length;
  const pendingCount = Math.max(0, totalOccupied - checkedInCount);
  const attendancePercent = totalOccupied > 0 ? Math.round((checkedInCount / totalOccupied) * 100) : 0;

  // Filtered seats for list view
  const filteredSeats = existingSeats.filter(s => {
    if (filterStatus === 'checkedIn' && !s.checkedIn) return false;
    if (filterStatus === 'pending' && s.checkedIn) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = s.guestName.toLowerCase().includes(q);
      const matchCode = (s.ticketCode || `GRAD69-${s.table}${s.seat}`).toLowerCase().includes(q);
      const matchTable = `โต๊ะ ${s.table}`.toLowerCase().includes(q);
      return matchName || matchCode || matchTable;
    }
    return true;
  });

  const activeTableConfig = TABLES.find(t => t.id === selectedTableId) || TABLES[0];

  return (
    <div className="max-w-6xl mx-auto mb-16 space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-amber-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-sky-500/20 text-amber-300 text-xs font-semibold mb-2 border border-amber-400/30">
              <QrCode className="w-3.5 h-3.5" />
              <span>REGISTRATION DESK & EVENT CHECK-IN</span>
            </div>
            <h2 className="font-serif-thai text-2xl sm:text-3xl font-bold text-amber-100 flex items-center gap-2.5">
              <span>จุดลงทะเบียนและสแกน QR Code เข้างาน</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              วันงาน 21 ธันวาคม 2569 · ห้องแกรนด์บอลรูม โรงแรมราชาวดี ขอนแก่น (15 โต๊ะจีน 120 ที่นั่ง)
            </p>
          </div>

          {/* Sound toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                soundEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="เปิด/ปิดเสียงสัญญาณเมื่อสแกนสำเร็จ"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{soundEnabled ? 'เปิดเสียงเตือน' : 'ปิดเสียง'}</span>
            </button>
          </div>
        </div>

        {/* 4 Attendance Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>ผู้จองทั้งหมด</span>
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white font-serif-thai tabular-nums">
              {totalOccupied} <span className="text-sm font-normal text-slate-400">/ 120 ท่าน</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              เปิดโต๊ะจีน 15 โต๊ะ (โต๊ะละ 8 ที่)
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-600/40">
            <div className="flex items-center justify-between text-xs text-emerald-300 mb-1">
              <span>เช็คอินเข้างานแล้ว</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-300 font-serif-thai tabular-nums">
              {checkedInCount} <span className="text-sm font-normal text-emerald-400">ท่าน</span>
            </div>
            <div className="text-[11px] text-emerald-400/90 mt-1">
              คิดเป็น {attendancePercent}% ของผู้ลงทะเบียน
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-600/40">
            <div className="flex items-center justify-between text-xs text-amber-300 mb-1">
              <span>รอเช็คอินหน้างาน</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-amber-300 font-serif-thai tabular-nums">
              {pendingCount} <span className="text-sm font-normal text-amber-400">ท่าน</span>
            </div>
            <div className="text-[11px] text-amber-400/80 mt-1">
              ยังเดินทางมาไม่ถึง
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>โต๊ะที่มาครบ 8 คน</span>
              <Award className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-amber-200 font-serif-thai tabular-nums">
              {TABLES.filter(t => {
                const inTable = existingSeats.filter(s => s.table === t.id);
                return inTable.length === 8 && inTable.every(s => s.checkedIn);
              }).length}{' '}
              <span className="text-sm font-normal text-slate-400">/ 15 โต๊ะ</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              สมาชิกนั่งประจำโต๊ะครบ
            </div>
          </div>
        </div>
      </div>

      {/* SCANNER CONSOLE (Camera Viewfinder & Manual Scanner Input) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-500/30 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Camera / QR Scanner Viewfinder (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-amber-600" />
                <span>กล้องสแกน QR Code</span>
              </span>
              <button
                type="button"
                onClick={isCameraActive ? stopCamera : startCamera}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isCameraActive
                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow'
                }`}
              >
                {isCameraActive ? (
                  <>
                    <CameraOff className="w-3.5 h-3.5" />
                    <span>ปิดกล้อง</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    <span>เปิดกล้องสแกน QR</span>
                  </>
                )}
              </button>
            </div>

            {/* Viewfinder Window */}
            <div className="relative aspect-video sm:aspect-square bg-slate-950 rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-inner flex flex-col items-center justify-center text-center p-4">
              {isCameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Laser scan line overlay */}
                  <div className="absolute inset-x-8 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#fbbf24] animate-bounce pointer-events-none" />
                  {/* Target frame corners */}
                  <div className="absolute w-44 h-44 border-2 border-dashed border-amber-400/80 rounded-2xl pointer-events-none flex items-center justify-center">
                    <span className="text-[10px] text-amber-300 bg-slate-950/70 px-2 py-0.5 rounded backdrop-blur-xs">
                      จ่อ QR Code ในกรอบนี้
                    </span>
                  </div>
                </>
              ) : (
                <div className="space-y-3 p-4">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center mx-auto text-amber-400">
                    <QrCode className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="font-serif-thai text-sm font-bold text-slate-200 block">
                      กล้องยังไม่ได้เปิดใช้งาน
                    </span>
                    <span className="text-xs text-slate-400 mt-1 block">
                      กดปุ่ม "เปิดกล้องสแกน QR" ด้านบน หรือใช้ช่องกรอกรหัสบัตรด้านข้าง
                    </span>
                  </div>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                {cameraError}
              </div>
            )}
          </div>

          {/* Right: Manual Lookup / Handheld Scanner Input & Last Result (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Hardware Barcode & QR Gun Scanner Indicator */}
            <div
              className={`p-4 rounded-2xl border-2 transition-all duration-300 ${
                hardwareScanFlash
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-950 scale-[1.02] ring-4 ring-emerald-400/50 shadow-lg'
                  : 'bg-gradient-to-r from-emerald-50/80 via-white to-amber-50/60 border-emerald-300 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="font-bold text-xs text-slate-800">
                    โหมดเครื่องยิงสแกนเนอร์ฮาร์ดแวร์ (USB & Bluetooth 2D Scanner Ready)
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                  พร้อมยิงบัตรได้ทันที
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                เจ้าหน้าที่สามารถใช้เครื่องสแกนบาร์โค้ด / QR Code ยิงที่บัตรของแขกได้โดยตรงตลอดเวลา ระบบจะรับรหัสและประมวลผลเช็คอินอัตโนมัติพร้อมเสียงเตือน
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                สแกนด้วยเครื่องยิงบาร์โค้ด / ป้อนรหัสบัตร หรือ ชื่อผู้ร่วมงาน
              </label>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleProcessCode(manualCode);
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="scanner-manual-input"
                    type="text"
                    value={manualCode}
                    onChange={e => setManualCode(e.target.value)}
                    placeholder="ยิงบาร์โค้ด หรือพิมพ์ เช่น GRAD69-0205 หรือ ชื่อบัณฑิต..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl text-sm font-bold shadow transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>บันทึกเข้างาน</span>
                </button>
              </form>
              <p className="text-[11px] text-slate-400 mt-1.5">
                รองรับเครื่องยิงบาร์โค้ด USB 2D / สแกนเนอร์ไร้สาย Bluetooth / กล้องมือถือ / ค้นหาชื่อ
              </p>
            </div>

            {/* Quick Test / Demo Scan shortcuts */}
            {existingSeats.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  ตัวอย่างบัตรสำหรับทดสอบสแกนด่วน:
                </span>
                <div className="flex flex-wrap gap-2">
                  {existingSeats.slice(0, 4).map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleProcessCode(s.ticketCode || `GRAD69-${s.table}${s.seat}`)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-amber-400 text-xs text-slate-700 font-medium shadow-2xs hover:bg-amber-50/50 flex items-center gap-1.5 transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        {s.guestName.split(' ')[0]} (โต๊ะ {s.table} ที่ {s.seat})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Scan Result Feedback Banner */}
            {lastScannedResult && (
              <div
                className={`p-5 rounded-2xl border-2 transition-all animate-in zoom-in-95 duration-200 ${
                  lastScannedResult.status === 'success'
                    ? 'bg-emerald-950/90 text-white border-emerald-400 shadow-xl'
                    : lastScannedResult.status === 'already-checked'
                    ? 'bg-amber-950/90 text-white border-amber-400 shadow-xl'
                    : 'bg-rose-950/90 text-white border-rose-400 shadow-xl'
                }`}
              >
                {lastScannedResult.status === 'success' && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 text-emerald-400">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                          ✓ บันทึกเช็คอินเข้างานสำเร็จ ({lastScannedResult.timestamp} น.)
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-bold border border-emerald-400/40">
                          CHECKED IN
                        </span>
                      </div>
                      <h4 className="font-serif-thai text-xl font-bold text-white">
                        {lastScannedResult.seat.guestName}
                      </h4>
                      <p className="text-xs text-slate-200">
                        ตำแหน่งที่นั่ง:{' '}
                        <strong className="text-amber-300 font-serif-thai text-base">
                          โต๊ะ {lastScannedResult.seat.table} (เก้าอี้ที่ {lastScannedResult.seat.seat})
                        </strong>{' '}
                        · {TABLES.find(t => t.id === lastScannedResult.seat.table)?.name}
                      </p>
                    </div>
                  </div>
                )}

                {lastScannedResult.status === 'already-checked' && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-400">
                      <AlertCircle className="w-7 h-7" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                          ⚠️ บัตรนี้ได้ทำการเช็คอินเข้างานแล้ว
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/30 text-amber-200 text-xs font-bold border border-amber-400/40">
                          ALREADY ENTERED
                        </span>
                      </div>
                      <h4 className="font-serif-thai text-xl font-bold text-white">
                        {lastScannedResult.seat.guestName}
                      </h4>
                      <p className="text-xs text-slate-200">
                        โต๊ะที่นั่ง: โต๊ะ {lastScannedResult.seat.table} เก้าอี้ที่ {lastScannedResult.seat.seat}
                      </p>
                    </div>
                  </div>
                )}

                {lastScannedResult.status === 'not-found' && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center shrink-0 text-rose-400">
                      <AlertCircle className="w-7 h-7" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <span className="text-xs font-bold text-rose-300 uppercase tracking-wider block">
                        ❌ ไม่พบข้อมูลบัตรในระบบ
                      </span>
                      <p className="text-xs text-slate-200">
                        รหัส "{lastScannedResult.seat.ticketCode}" ไม่ตรงกับผู้ร่วมงานใด โปรดตรวจสอบการสะกดหรือติดต่อโต๊ะช่วยเหลือ
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          LIVE SEATING & REGISTRATION OVERVIEW ("เห็นทั้งหมดเหมือนลงทะเบียนจองที่นั่ง")
         ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-500/30 shadow-xl space-y-6">
        {/* Navigation Tabs between Ballroom Grid / Chinese Banquet Table / Guest List */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
              LIVE SEATING & ATTENDANCE DASHBOARD
            </div>
            <h3 className="font-serif-thai text-xl sm:text-2xl font-bold text-slate-900">
              ผังที่นั่งและรายชื่อผู้เข้าร่วมงานทั้งหมด (เห็นสถานะสด 15 โต๊ะ)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ตรวจสอบว่าใครนั่งโต๊ะไหน ใครมาถึงงานแล้ว และกดเช็คอินได้จากตรงนี้ทันที
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewTab('tables')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewTab === 'tables'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>ผังห้อง 15 โต๊ะ</span>
            </button>

            <button
              type="button"
              onClick={() => setViewTab('banquet')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewTab === 'banquet'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CircleDot className="w-3.5 h-3.5" />
              <span>โต๊ะจีน 8 คน</span>
            </button>

            <button
              type="button"
              onClick={() => setViewTab('list')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewTab === 'list'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>ตารางรายชื่อ</span>
            </button>
          </div>
        </div>

        {/* TAB 1: 15 BANQUET TABLES IN BALLROOM */}
        {viewTab === 'tables' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {TABLES.map(t => {
                const seatsInTable = existingSeats.filter(s => s.table === t.id);
                const bookedCount = seatsInTable.length;
                const hereCount = seatsInTable.filter(s => s.checkedIn).length;
                const isAllHere = bookedCount === 8 && hereCount === 8;

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTableId(t.id);
                      setViewTab('banquet');
                    }}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer group hover:-translate-y-1 hover:shadow-lg ${
                      isAllHere
                        ? 'border-emerald-400 bg-emerald-50/40'
                        : hereCount > 0
                        ? 'border-amber-300 bg-amber-50/30'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-base text-slate-900 group-hover:text-amber-700 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-900 text-amber-300 text-xs inline-flex items-center justify-center font-bold">
                          {t.id}
                        </span>
                        <span>{t.name}</span>
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          isAllHere
                            ? 'bg-emerald-100 text-emerald-800'
                            : hereCount > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        เข้างานแล้ว {hereCount}/{bookedCount} คน
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mb-3">
                      {t.zone} · จองแล้ว {bookedCount}/8 ที่
                    </div>

                    {/* Progress Bar of Attendance */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-300"
                        style={{
                          width: `${bookedCount > 0 ? (hereCount / bookedCount) * 100 : 0}%`
                        }}
                      />
                    </div>

                    {/* 8 Seats Mini Indicators */}
                    <div className="grid grid-cols-4 gap-1 text-[10px]">
                      {Array.from({ length: 8 }, (_, i) => i + 1).map(sNum => {
                        const sInfo = seatsInTable.find(s => s.seat === sNum);
                        return (
                          <div
                            key={sNum}
                            title={sInfo ? `${sInfo.guestName} (${sInfo.checkedIn ? 'มาแล้ว' : 'ยังไม่มา'})` : 'เก้าอี้ว่าง'}
                            className={`py-1 rounded text-center font-bold ${
                              sInfo?.checkedIn
                                ? 'bg-emerald-600 text-white'
                                : sInfo
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {sNum}
                          </div>
                        );
                      })}
                    </div>

                    <div className="text-right mt-3">
                      <span className="text-xs text-amber-700 font-bold group-hover:underline flex items-center justify-end gap-1">
                        <span>ดูผังโต๊ะจีน 8 คน</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: CHINESE BANQUET TABLE (8 Chairs in circle with check-in buttons) */}
        {viewTab === 'banquet' && (
          <div className="space-y-6">
            {/* Table Selector Pills */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700 block mb-2">
                เลือกโต๊ะจีน (1–15) เพื่อดูผังเก้าอี้และเช็คอิน:
              </span>
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-15 gap-1.5">
                {TABLES.map(t => {
                  const seatsInTable = existingSeats.filter(s => s.table === t.id);
                  const isSelected = t.id === selectedTableId;
                  const hereCount = seatsInTable.filter(s => s.checkedIn).length;

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTableId(t.id)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center border ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md ring-2 ring-amber-300'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div>โต๊ะ {t.id}</div>
                      <div className="text-[10px] opacity-80 font-normal">
                        {hereCount}/{seatsInTable.length}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Banquet Table Visual */}
            <ChineseBanquetTable
              table={activeTableConfig}
              seats={existingSeats}
              interactive={true}
              onSelectSeat={(seatNum) => onToggleCheckIn(selectedTableId, seatNum)}
            />

            {/* Direct check-in list for this specific table */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  รายชื่อแขกประจำโต๊ะ {selectedTableId} ({activeTableConfig.name}):
                </span>
                <span className="text-xs text-slate-500">
                  คลิกที่ปุ่มเพื่อสลับสถานะเช็คอินได้ทันที
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {Array.from({ length: 8 }, (_, i) => i + 1).map(sNum => {
                  const sInfo = existingSeats.find(
                    s => s.table === selectedTableId && s.seat === sNum
                  );

                  return (
                    <div
                      key={sNum}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        sInfo?.checkedIn
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : sInfo
                          ? 'bg-white border-slate-300 text-slate-800'
                          : 'bg-slate-100/60 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="w-6 h-6 rounded-md bg-slate-900 text-amber-300 font-bold flex items-center justify-center text-xs shrink-0">
                          {sNum}
                        </span>
                        <div className="truncate">
                          <span className="font-semibold block truncate">
                            {sInfo ? sInfo.guestName : '(เก้าอี้ว่าง)'}
                          </span>
                          {sInfo && (
                            <span className="text-[10px] text-slate-500">
                              {sInfo.ticketCode || `GRAD69-${sInfo.table}${sInfo.seat}`}
                            </span>
                          )}
                        </div>
                      </div>

                      {sInfo ? (
                        <button
                          type="button"
                          onClick={() => onToggleCheckIn(selectedTableId, sNum)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                            sInfo.checkedIn
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs'
                          }`}
                        >
                          {sInfo.checkedIn ? '✓ มาแล้ว' : 'กดเช็คอิน'}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">ว่าง</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FULL ATTENDEE ROSTER LIST WITH SEARCH & 1-CLICK CHECK-IN */}
        {viewTab === 'list' && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาชื่อผู้ร่วมงาน, รหัสบัตร, หรือ โต๊ะ..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    filterStatus === 'all'
                      ? 'bg-slate-900 text-amber-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ทั้งหมด ({totalOccupied})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('checkedIn')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    filterStatus === 'checkedIn'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  มาแล้ว ({checkedInCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('pending')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    filterStatus === 'pending'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  รอเช็คอิน ({pendingCount})
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                    <th className="py-3 px-4 font-semibold">โต๊ะ / เก้าอี้</th>
                    <th className="py-3 px-4 font-semibold">ชื่อ–นามสกุล</th>
                    <th className="py-3 px-4 font-semibold">ประเภท</th>
                    <th className="py-3 px-4 font-semibold">รหัสบัตร</th>
                    <th className="py-3 px-4 font-semibold text-center">สถานะ</th>
                    <th className="py-3 px-4 font-semibold text-center">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSeats.map((seat, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        โต๊ะ {seat.table} <span className="font-normal text-slate-500">(เก้าอี้ {seat.seat})</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {seat.guestName}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100">
                          {seat.category === 'faculty' ? 'อาจารย์' : 'บัณฑิต'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">
                        {seat.ticketCode || `GRAD69-${seat.table}${seat.seat}`}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            seat.checkedIn
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {seat.checkedIn ? '✓ เข้างานแล้ว' : 'ยังไม่มา'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleCheckIn(seat.table, seat.seat)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                            seat.checkedIn
                              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          }`}
                        >
                          {seat.checkedIn ? 'ยกเลิก' : 'เช็คอิน'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredSeats.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs sm:text-sm">
                  ไม่พบข้อมูลผู้ร่วมงานตามเงื่อนไขที่เลือก
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
