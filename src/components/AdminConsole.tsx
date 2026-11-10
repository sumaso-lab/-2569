import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  DollarSign,
  Download,
  Search,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Ticket,
  X,
  Eye,
  Sparkles,
  Lock,
  Unlock,
  KeyRound,
  Edit3,
  UserPlus,
  ArrowRightLeft,
  Check,
  AlertCircle,
  FileCheck,
  PhoneCall,
  LayoutGrid,
  Mail,
  FlaskConical,
  ExternalLink,
  FileText,
  FolderOpen,
  FileCheck2,
  Printer,
  Paperclip,
  Clock,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw
} from 'lucide-react';
import { ExistingSeat, ReservationRecord, AttendeeCategory, GuestInfo, AttachedDocument } from '../types';
import {
  TABLES,
  getAdminPasscode,
  setAdminPasscode,
  DEFAULT_ADMIN_PASSCODE
} from '../data/initialData';
import { EmailTicketModal } from './EmailTicketModal';
import { DigitalPassCard } from './DigitalPassCard';
import {
  getEmailDispatchLogs,
  trigger24hReminderEmail,
  sendImmediateApprovalEmail,
  EmailDispatchRecord
} from '../utils/emailService';
import { generateRealisticSlipDataUrl } from '../utils/slipGenerator';
import {
  getReservationDocuments,
  getAllAttachedDocuments,
  EnrichedAttachedDocument,
  downloadFileFromUrl
} from '../utils/documentHelper';
import { dispatchTicketEmail, getDocumentSignedUrl } from '../bookingApi';

interface AdminConsoleProps {
  existingSeats: ExistingSeat[];
  reservations: ReservationRecord[];
  onToggleCheckIn: (table: number, seat: number) => void;
  onResetData: () => void;
  onUpdateReservationStatus?: (id: string, status: 'verified' | 'pending' | 'rejected') => void;
  onUpdateReservation?: (record: ReservationRecord) => void;
  onDeleteReservation?: (id: string) => void;
  onUpdateSeat?: (table: number, seat: number, updated: Partial<ExistingSeat>) => void;
  onReassignSeat?: (oldTable: number, oldSeat: number, newTable: number, newSeat: number, data: Partial<ExistingSeat>) => void;
  onSwapSeats?: (tableA: number, seatA: number, tableB: number, seatB: number) => void;
  onDeleteSeat?: (table: number, seat: number) => void;
  onAddManualSeat?: (newSeat: ExistingSeat) => void;
  onStartTestRegistration?: () => void;
}

const TICKET_PRICE = 799;

export function parseReservationDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;

  const parts = dateStr.match(/(\d+)\/(\d+)\/(\d+)(?:[,\s]+(\d+):(\d+)(?::(\d+))?)?/);
  if (parts) {
    const day = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1;
    let year = parseInt(parts[3], 10);
    if (year > 2400) year -= 543;
    const hours = parts[4] ? parseInt(parts[4], 10) : 0;
    const minutes = parts[5] ? parseInt(parts[5], 10) : 0;
    const seconds = parts[6] ? parseInt(parts[6], 10) : 0;
    const parsed = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

export function isPendingOver48Hours(res: { status: string; createdAt?: string; slipTimestamp?: string }): {
  isOverdue: boolean;
  hoursAgo: number;
} {
  if (res.status !== 'pending') return { isOverdue: false, hoursAgo: 0 };
  const d = parseReservationDate(res.createdAt) || parseReservationDate(res.slipTimestamp);
  if (!d) return { isOverdue: false, hoursAgo: 0 };
  const diffMs = Date.now() - d.getTime();
  const hoursAgo = Math.floor(diffMs / (1000 * 60 * 60));
  return {
    isOverdue: hoursAgo >= 48,
    hoursAgo
  };
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  existingSeats,
  reservations,
  onToggleCheckIn,
  onResetData,
  onUpdateReservationStatus,
  onUpdateReservation,
  onDeleteReservation,
  onUpdateSeat,
  onReassignSeat,
  onSwapSeats,
  onDeleteSeat,
  onAddManualSeat,
  onStartTestRegistration
}) => {
  // Passcode Security States
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('grad69_admin_authenticated') === 'true';
  });
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [showPasscodeChangeModal, setShowPasscodeChangeModal] = useState(false);
  const [newPasscode, setNewPasscode] = useState('');
  const [passcodeSuccessMsg, setPasscodeSuccessMsg] = useState('');

  useEffect(() => {
    if (isAuthenticated && !sessionStorage.getItem('grad69_admin_passcode')) {
      sessionStorage.setItem('grad69_admin_passcode', DEFAULT_ADMIN_PASSCODE);
    }
  }, [isAuthenticated]);

  // Active Admin Tab: slips | docs | roster | floorplan | addGuest | emails | settings
  const [activeTab, setActiveTab] = useState<'slips' | 'docs' | 'roster' | 'floorplan' | 'addGuest' | 'emails' | 'settings'>('slips');
  const [emailLogs, setEmailLogs] = useState<EmailDispatchRecord[]>(() => getEmailDispatchLogs());

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTableFilter, setSelectedTableFilter] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checkedIn' | 'notCheckedIn'>('all');
  const [slipFilter, setSlipFilter] = useState<'all' | 'pending' | 'pendingOver48h' | 'verified' | 'rejected'>('all');

  // All Documents Gallery Filters
  const [docTypeFilter, setDocTypeFilter] = useState<'all' | 'slip' | 'voucher' | 'other'>('all');
  const [docStatusFilter, setDocStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [docSearchTerm, setDocSearchTerm] = useState('');
  const [docViewMode, setDocViewMode] = useState<'grid' | 'table'>('grid');

  // Modal States
  const [selectedTicketSeat, setSelectedTicketSeat] = useState<ExistingSeat | null>(null);
  const [previewDocumentModal, setPreviewDocumentModal] = useState<{
    reservation: ReservationRecord;
    documents: AttachedDocument[];
    activeDocIndex: number;
  } | null>(null);
  const [previewSlipUrl, setPreviewSlipUrl] = useState<{ url: string; title: string; reservation?: ReservationRecord } | null>(null);
  const [emailModalSeat, setEmailModalSeat] = useState<ExistingSeat | null>(null);

  // Real Server Deletion Modal State
  const [deletingReservation, setDeletingReservation] = useState<ReservationRecord | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Signed URL State for Viewing Private Storage Files
  const [signedUrlLoading, setSignedUrlLoading] = useState(false);
  const [activeSignedUrl, setActiveSignedUrl] = useState<string>('');
  const [imageZoomLevel, setImageZoomLevel] = useState<number>(1);

  // Staff Test Cases in Sandbox (Persisted in localStorage for convenience)
  const [testCases, setTestCases] = useState<ReservationRecord[]>(() => {
    try {
      const saved = localStorage.getItem('grad69_staff_test_cases_v3');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const saveTestCases = (newCases: ReservationRecord[]) => {
    setTestCases(newCases);
    localStorage.setItem('grad69_staff_test_cases_v3', JSON.stringify(newCases));
  };

  // Merge Test Cases with actual reservations (Test cases prioritized at top)
  const allReservations: ReservationRecord[] = [
    ...testCases,
    ...reservations.filter(r => !testCases.some(tc => tc.id === r.id))
  ];

  // 1. Edit Single Seat / Attendee Modal State
  const [editingSeat, setEditingSeat] = useState<ExistingSeat | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<AttendeeCategory>('guest');
  const [editTable, setEditTable] = useState<number>(1);
  const [editSeatNum, setEditSeatNum] = useState<number>(1);
  const [editTicketCode, setEditTicketCode] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCheckedIn, setEditCheckedIn] = useState(false);

  // 2. Full Reservation Edit Modal State ("เจ้าหน้าที่สามารถแก้ไขได้หมด")
  const [editingReservation, setEditingReservation] = useState<ReservationRecord | null>(null);
  const [editResBooker, setEditResBooker] = useState('');
  const [editResPhone, setEditResPhone] = useState('');
  const [editResEmail, setEditResEmail] = useState('');
  const [editResCategory, setEditResCategory] = useState<AttendeeCategory>('graduate');
  const [editResStatus, setEditResStatus] = useState<'verified' | 'pending' | 'rejected'>('pending');
  const [editResRejectionReason, setEditResRejectionReason] = useState('');
  const [editResNotes, setEditResNotes] = useState('');
  const [editResGuests, setEditResGuests] = useState<GuestInfo[]>([]);

  // 3. Direct Group Seating Assign Modal State
  const [assigningReservation, setAssigningReservation] = useState<ReservationRecord | null>(null);
  const [assignTableMap, setAssignTableMap] = useState<Record<number, { table: number; seat: number }>>({});

  // 4. Seat Swap Modal State
  const [swappingSeat, setSwappingSeat] = useState<ExistingSeat | null>(null);
  const [swapTargetTable, setSwapTargetTable] = useState<number>(1);
  const [swapTargetSeat, setSwapTargetSeat] = useState<number>(1);

  // 5. Add Walk-in Guest Form States
  const [addName, setAddName] = useState('');
  const [addCategory, setAddCategory] = useState<AttendeeCategory>('graduate');
  const [addTable, setAddTable] = useState<number>(3);
  const [addSeatNum, setAddSeatNum] = useState<number>(1);
  const [addPhone, setAddPhone] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addSuccessMsg, setAddSuccessMsg] = useState('');

  // 6. Selected Seat on Interactive Floor Plan
  const [floorPlanSelectedSeat, setFloorPlanSelectedSeat] = useState<{ table: number; seat: number } | null>(null);

  // Stats
  const totalCapacity = 96;
  const totalOccupied = existingSeats.length;
  const checkedInCount = existingSeats.filter(s => s.checkedIn).length;
  const totalRevenue = totalOccupied * TICKET_PRICE;
  const pendingSlipsCount = allReservations.filter(r => r.status === 'pending').length;

  // Handle Passcode Login
  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const correctCode = getAdminPasscode();
    const entered = passcodeInput.trim();
    if (entered === correctCode || entered === DEFAULT_ADMIN_PASSCODE) {
      setIsAuthenticated(true);
      sessionStorage.setItem('grad69_admin_authenticated', 'true');
      sessionStorage.setItem('grad69_admin_passcode', entered || DEFAULT_ADMIN_PASSCODE);
      setPasscodeError('');
    } else {
      setPasscodeError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('grad69_admin_authenticated');
    sessionStorage.removeItem('grad69_admin_passcode');
    setPasscodeInput('');
  };

  const handleChangePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasscode.trim().length < 4) {
      alert('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
      return;
    }
    setAdminPasscode(newPasscode.trim());
    setShowPasscodeChangeModal(false);
    setNewPasscode('');
    setPasscodeSuccessMsg('เปลี่ยนรหัสผ่านเจ้าหน้าที่เรียบร้อยแล้ว');
    setTimeout(() => setPasscodeSuccessMsg(''), 4000);
  };

  // Open Edit Seat Modal
  const handleOpenEdit = (seat: ExistingSeat) => {
    setEditingSeat(seat);
    setEditName(seat.guestName);
    setEditCategory(seat.category);
    setEditTable(seat.table);
    setEditSeatNum(seat.seat);
    setEditTicketCode(seat.ticketCode || `GRAD69-T${String(seat.table).padStart(2, '0')}S${String(seat.seat).padStart(2, '0')}`);
    setEditPhone(seat.phone || '');
    setEditEmail(seat.email || '');
    setEditNotes(seat.notes || '');
    setEditCheckedIn(seat.checkedIn || false);
  };

  // Save Single Seat Edits
  const handleSaveSeatEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSeat) return;

    if (!editName.trim()) {
      alert('กรุณากรอกชื่อ–นามสกุลผู้ร่วมงาน');
      return;
    }

    const isPositionChanged = editTable !== editingSeat.table || editSeatNum !== editingSeat.seat;
    if (isPositionChanged) {
      const isTargetOccupied = existingSeats.some(
        s => s.table === editTable && s.seat === editSeatNum && !(s.table === editingSeat.table && s.seat === editingSeat.seat)
      );
      if (isTargetOccupied) {
        if (window.confirm(`โต๊ะ ${editTable} ที่นั่งที่ ${editSeatNum} มีผู้จองอยู่แล้ว ต้องการสลับที่นั่งกับท่านเดิมหรือไม่?`)) {
          if (onSwapSeats) {
            onSwapSeats(editingSeat.table, editingSeat.seat, editTable, editSeatNum);
          }
        } else {
          return;
        }
      } else {
        if (onReassignSeat) {
          onReassignSeat(editingSeat.table, editingSeat.seat, editTable, editSeatNum, {
            guestName: editName.trim(),
            category: editCategory,
            ticketCode: editTicketCode.trim() || `GRAD69-T${String(editTable).padStart(2, '0')}S${String(editSeatNum).padStart(2, '0')}`,
            checkedIn: editCheckedIn,
            phone: editPhone.trim(),
            email: editEmail.trim(),
            notes: editNotes.trim()
          });
        }
      }
    } else {
      if (onUpdateSeat) {
        onUpdateSeat(editingSeat.table, editingSeat.seat, {
          guestName: editName.trim(),
          category: editCategory,
          ticketCode: editTicketCode.trim(),
          checkedIn: editCheckedIn,
          phone: editPhone.trim(),
          email: editEmail.trim(),
          notes: editNotes.trim()
        });
      }
    }

    setEditingSeat(null);
  };

  // Open Full Reservation Edit Modal
  const handleOpenEditReservation = (res: ReservationRecord) => {
    setEditingReservation(res);
    setEditResBooker(res.mainBooker);
    setEditResPhone(res.phone);
    setEditResEmail(res.email);
    setEditResCategory(res.category);
    setEditResStatus(res.status);
    setEditResRejectionReason(res.rejectionReason || '');
    setEditResNotes(res.notes || '');
    const guestList = (res.guests || []).map((g, idx) => {
      const assign = res.assignments?.[idx];
      return {
        ...g,
        table: g.table || assign?.table,
        seat: g.seat || assign?.seat,
        ticketCode: g.ticketCode || (assign ? `GRAD69-T${String(assign.table).padStart(2, '0')}S${String(assign.seat).padStart(2, '0')}` : '')
      };
    });
    setEditResGuests(guestList);
  };

  // Save Full Reservation Edit ("เจ้าหน้าที่สามารถแก้ไขได้หมด")
  const handleSaveFullReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReservation) return;

    if (!editResBooker.trim()) {
      alert('กรุณากรอกชื่อผู้จอง');
      return;
    }

    const newAssignments: Record<number, { table: number; seat: number }> = { ...(editingReservation.assignments || {}) };
    const finalizedGuests: GuestInfo[] = editResGuests.map((g, idx) => {
      const assignedTable = g.table;
      const assignedSeat = g.seat;
      if (assignedTable && assignedSeat) {
        newAssignments[idx] = { table: assignedTable, seat: assignedSeat };
        const code = g.ticketCode || `GRAD69-T${String(assignedTable).padStart(2, '0')}S${String(assignedSeat).padStart(2, '0')}`;
        return {
          ...g,
          table: assignedTable,
          seat: assignedSeat,
          ticketCode: code
        };
      }
      return g;
    });

    const updatedRecord: ReservationRecord = {
      ...editingReservation,
      mainBooker: editResBooker.trim(),
      phone: editResPhone.trim(),
      email: editResEmail.trim(),
      category: editResCategory,
      status: editResStatus,
      rejectionReason: editResStatus === 'rejected' ? editResRejectionReason.trim() : undefined,
      notes: editResNotes.trim(),
      guests: finalizedGuests,
      assignments: newAssignments
    };

    if (onUpdateReservation) {
      onUpdateReservation(updatedRecord);
    } else if (onUpdateReservationStatus) {
      onUpdateReservationStatus(updatedRecord.id, editResStatus);
    }

    setEditingReservation(null);
  };

  // Open Group Seat Assignment Modal
  const handleOpenAssignGroupSeating = (res: ReservationRecord) => {
    setAssigningReservation(res);
    const initialMap: Record<number, { table: number; seat: number }> = {};
    res.guests.forEach((g, idx) => {
      const existing = res.assignments?.[idx];
      if (existing) {
        initialMap[idx] = { table: existing.table, seat: existing.seat };
      } else {
        // find a vacant seat
        let foundT = 3;
        let foundS = 1;
        for (let t = 1; t <= 12; t++) {
          for (let s = 1; s <= 8; s++) {
            const isTaken = existingSeats.some(es => es.table === t && es.seat === s) ||
              Object.values(initialMap).some(m => m.table === t && m.seat === s);
            if (!isTaken) {
              foundT = t;
              foundS = s;
              break;
            }
          }
          if (foundT !== 3 || foundS !== 1) break;
        }
        initialMap[idx] = { table: foundT, seat: foundS };
      }
    });
    setAssignTableMap(initialMap);
  };

  // Save Group Seat Assignment
  const handleSaveGroupSeating = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningReservation) return;

    const newAssignments: Record<number, { table: number; seat: number }> = {};
    const updatedGuests: GuestInfo[] = assigningReservation.guests.map((g, idx) => {
      const pos = assignTableMap[idx] || { table: 3, seat: 1 };
      newAssignments[idx] = pos;
      const code = g.ticketCode || `GRAD69-T${String(pos.table).padStart(2, '0')}S${String(pos.seat).padStart(2, '0')}`;
      return {
        ...g,
        table: pos.table,
        seat: pos.seat,
        ticketCode: code
      };
    });

    const updatedRecord: ReservationRecord = {
      ...assigningReservation,
      assignments: newAssignments,
      guests: updatedGuests,
      status: 'verified' // automatically marks verified when seated
    };

    if (onUpdateReservation) {
      onUpdateReservation(updatedRecord);
    }

    setAssigningReservation(null);
  };

  // Open Seat Swap Modal
  const handleOpenSwap = (seat: ExistingSeat) => {
    setSwappingSeat(seat);
    // default target to next seat
    setSwapTargetTable(seat.table);
    setSwapTargetSeat(seat.seat === 8 ? 1 : seat.seat + 1);
  };

  const handleExecuteSwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!swappingSeat) return;

    if (swappingSeat.table === swapTargetTable && swappingSeat.seat === swapTargetSeat) {
      alert('กรุณาเลือกที่นั่งปลายทางที่ต่างจากที่นั่งปัจจุบัน');
      return;
    }

    if (onSwapSeats) {
      onSwapSeats(swappingSeat.table, swappingSeat.seat, swapTargetTable, swapTargetSeat);
    }
    setSwappingSeat(null);
  };

  // Delete / Free Seat
  const handleDeleteSeat = (seat: ExistingSeat) => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการยกเลิกที่นั่ง โต๊ะ ${seat.table} ที่นั่ง ${seat.seat} (${seat.guestName})?`)) {
      if (onDeleteSeat) {
        onDeleteSeat(seat.table, seat.seat);
      }
    }
  };

  // Real Atomic Server Deletion Handler
  const handleExecuteDelete = async () => {
    if (!deletingReservation || !onDeleteReservation) return;
    setIsDeleting(true);
    try {
      await onDeleteReservation(deletingReservation.id);
      if (testCases.some(tc => tc.id === deletingReservation.id)) {
        saveTestCases(testCases.filter(tc => tc.id !== deletingReservation.id));
      }
      setDeletingReservation(null);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการลบข้อมูลการจอง');
    } finally {
      setIsDeleting(false);
    }
  };

  // Add Walk-in Guest
  const handleAddWalkinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      alert('กรุณากรอกชื่อผู้ร่วมงาน');
      return;
    }

    const isOccupied = existingSeats.some(s => s.table === addTable && s.seat === addSeatNum);
    if (isOccupied) {
      alert(`โต๊ะ ${addTable} ที่นั่งที่ ${addSeatNum} มีผู้จองอยู่แล้ว กรุณาเลือกที่นั่งว่าง`);
      return;
    }

    const generatedCode = `GRAD69-T${String(addTable).padStart(2, '0')}S${String(addSeatNum).padStart(2, '0')}-${Math.floor(10 + Math.random() * 90)}`;
    const newGuestSeat: ExistingSeat = {
      table: addTable,
      seat: addSeatNum,
      guestName: addName.trim(),
      category: addCategory,
      ticketCode: generatedCode,
      checkedIn: false,
      phone: addPhone.trim(),
      email: addEmail.trim()
    };

    if (onAddManualSeat) {
      onAddManualSeat(newGuestSeat);
    }

    setAddSuccessMsg(`เพิ่มที่นั่ง โต๊ะ ${addTable} ที่นั่ง ${addSeatNum} สำหรับคุณ ${addName} สำเร็จ`);
    setAddName('');
    setAddPhone('');
    setAddEmail('');
    setTimeout(() => setAddSuccessMsg(''), 4000);
  };

  // Filtered Roster
  const filteredSeats = existingSeats.filter(s => {
    if (selectedTableFilter !== 'all' && s.table !== selectedTableFilter) return false;
    if (statusFilter === 'checkedIn' && !s.checkedIn) return false;
    if (statusFilter === 'notCheckedIn' && s.checkedIn) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = s.guestName.toLowerCase().includes(q);
      const matchCode = s.ticketCode?.toLowerCase().includes(q);
      const matchPhone = s.phone?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchPhone) return false;
    }

    return true;
  });

  const overduePendingCount = allReservations.filter(r => r.status === 'pending' && isPendingOver48Hours(r).isOverdue).length;

  // Filtered Slips
  const filteredReservations = allReservations.filter(r => {
    if (slipFilter === 'pendingOver48h') {
      if (r.status !== 'pending' || !isPendingOver48Hours(r).isOverdue) return false;
    } else if (slipFilter !== 'all' && r.status !== slipFilter) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        r.mainBooker.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.guests.some(g => g.name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // All Attached Documents across all bookings
  const allAttachedDocs: EnrichedAttachedDocument[] = getAllAttachedDocuments(allReservations);

  // Filtered Documents in Gallery Tab
  const filteredDocs = allAttachedDocs.filter(doc => {
    if (docTypeFilter !== 'all' && doc.type !== docTypeFilter) return false;
    if (docStatusFilter !== 'all' && doc.reservationStatus !== docStatusFilter) return false;
    if (docSearchTerm.trim()) {
      const q = docSearchTerm.toLowerCase();
      return (
        doc.name.toLowerCase().includes(q) ||
        doc.bookerName.toLowerCase().includes(q) ||
        doc.reservationId.toLowerCase().includes(q) ||
        doc.phone.includes(q)
      );
    }
    return true;
  });

  const handleOpenDocumentViewer = async (reservation: ReservationRecord, initialDocIndex = 0) => {
    const docs = getReservationDocuments(reservation);
    const targetIdx = Math.min(Math.max(0, initialDocIndex), docs.length - 1);
    setPreviewDocumentModal({
      reservation,
      documents: docs,
      activeDocIndex: targetIdx
    });

    const activeDoc = docs[targetIdx];
    if (activeDoc && activeDoc.hasRealFile && activeDoc.url) {
      if (activeDoc.url.startsWith('data:') || activeDoc.url.startsWith('blob:')) {
        setActiveSignedUrl(activeDoc.url);
      } else {
        setSignedUrlLoading(true);
        try {
          const signed = await getDocumentSignedUrl(activeDoc.storagePath || activeDoc.url);
          setActiveSignedUrl(signed || activeDoc.url);
        } catch (e) {
          console.warn('Storage signed URL notice, using direct document URL:', e);
          setActiveSignedUrl(activeDoc.url);
        } finally {
          setSignedUrlLoading(false);
        }
      }
    } else {
      setActiveSignedUrl(activeDoc?.url || '');
    }
  };

  const handleSwitchDocIndex = async (newIndex: number) => {
    if (!previewDocumentModal) return;
    setPreviewDocumentModal(prev => prev ? { ...prev, activeDocIndex: newIndex } : null);
    const doc = previewDocumentModal.documents[newIndex];
    if (doc && doc.hasRealFile && doc.url) {
      if (doc.url.startsWith('data:') || doc.url.startsWith('blob:')) {
        setActiveSignedUrl(doc.url);
      } else {
        setSignedUrlLoading(true);
        try {
          const signed = await getDocumentSignedUrl(doc.storagePath || doc.url);
          setActiveSignedUrl(signed || doc.url);
        } catch (e) {
          console.warn('Storage signed URL notice, using direct document URL:', e);
          setActiveSignedUrl(doc.url);
        } finally {
          setSignedUrlLoading(false);
        }
      }
    } else {
      setActiveSignedUrl(doc?.url || '');
    }
  };

  // Handle Staff Test Cases
  const handleAddTestCase = (type: 'pending_single' | 'pending_multi' | 'verified_single') => {
    const timestamp = new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
    let newCase: ReservationRecord;

    if (type === 'pending_single') {
      const id = `TEST-P1-${Date.now().toString().slice(-4)}`;
      newCase = {
        id,
        mainBooker: 'พว. ชลธิชา วงศ์สุวรรณ',
        phone: '089-456-7890',
        email: 'cholticha.w@kku.ac.th',
        category: 'graduate',
        academicYear: '2569',
        guestCount: 1,
        totalAmount: 799,
        guests: [
          {
            id: `${id}-g1`,
            name: 'พว. ชลธิชา วงศ์สุวรรณ',
            category: 'graduate',
            phone: '089-456-7890',
            email: 'cholticha.w@kku.ac.th',
            table: 3,
            seat: 4,
            ticketCode: `GRAD69-T03S04-${Math.floor(10 + Math.random() * 90)}`
          }
        ],
        assignments: { 0: { table: 3, seat: 4 } },
        status: 'pending',
        slipUrl: generateRealisticSlipDataUrl({
          bank: 'SCB',
          bookerName: 'พว. ชลธิชา วงศ์สุวรรณ',
          amount: 799,
          refId: `SCB${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          dateStr: timestamp
        }),
        slipTimestamp: timestamp,
        createdAt: timestamp,
        notes: 'เคสทดสอบเจ้าหน้าที่: บัณฑิตพยาบาล 1 ที่นั่ง รอตรวจสลิป'
      };
    } else if (type === 'pending_multi') {
      const id = `TEST-P3-${Date.now().toString().slice(-4)}`;
      newCase = {
        id,
        mainBooker: 'ดร. กิตติพงษ์ เกียรติชัย',
        phone: '081-789-0123',
        email: 'kittipong.k@kku.ac.th',
        category: 'faculty',
        academicYear: '2569',
        guestCount: 3,
        totalAmount: 2397,
        guests: [
          {
            id: `${id}-g1`,
            name: 'ดร. กิตติพงษ์ เกียรติชัย',
            category: 'faculty',
            phone: '081-789-0123',
            email: 'kittipong.k@kku.ac.th',
            table: 5,
            seat: 1,
            ticketCode: `GRAD69-T05S01-${Math.floor(10 + Math.random() * 90)}`
          },
          {
            id: `${id}-g2`,
            name: 'นาง วรินทร เกียรติชัย',
            category: 'guest',
            table: 5,
            seat: 2,
            ticketCode: `GRAD69-T05S02-${Math.floor(10 + Math.random() * 90)}`
          },
          {
            id: `${id}-g3`,
            name: 'นาย ธนภูมิ เกียรติชัย',
            category: 'guest',
            table: 5,
            seat: 3,
            ticketCode: `GRAD69-T05S03-${Math.floor(10 + Math.random() * 90)}`
          }
        ],
        assignments: {
          0: { table: 5, seat: 1 },
          1: { table: 5, seat: 2 },
          2: { table: 5, seat: 3 }
        },
        status: 'pending',
        slipUrl: generateRealisticSlipDataUrl({
          bank: 'KBANK',
          bookerName: 'ดร. กิตติพงษ์ เกียรติชัย',
          amount: 2397,
          refId: `KBANK${Math.floor(10000000000 + Math.random() * 90000000000)}`,
          dateStr: timestamp
        }),
        slipTimestamp: timestamp,
        createdAt: timestamp,
        notes: 'เคสทดสอบเจ้าหน้าที่: อาจารย์และครอบครัว 3 ที่นั่ง รอตรวจสลิป'
      };
    } else if ((type as string) === 'pending_overdue') {
      const id = `TEST-URGENT-${Date.now().toString().slice(-4)}`;
      const pastTime = new Date(Date.now() - 52 * 60 * 60 * 1000); // 52 hours ago
      const pastTimestamp = pastTime.toLocaleString('th-TH');
      newCase = {
        id,
        mainBooker: 'พว. ธีรภัทร ชาญวิทย์ (รอดำเนินการ 52 ชม.)',
        phone: '085-777-9999',
        email: 'theerapat.test@kku.ac.th',
        category: 'graduate',
        academicYear: '2569',
        guestCount: 1,
        totalAmount: 799,
        guests: [
          {
            id: `${id}-g1`,
            name: 'พว. ธีรภัทร ชาญวิทย์',
            category: 'graduate',
            phone: '085-777-9999',
            email: 'theerapat.test@kku.ac.th',
            table: 4,
            seat: 1,
            ticketCode: `GRAD69-T04S01-${Math.floor(10 + Math.random() * 90)}`
          }
        ],
        assignments: { 0: { table: 4, seat: 1 } },
        status: 'pending',
        slipUrl: generateRealisticSlipDataUrl({
          bank: 'SCB',
          bookerName: 'พว. ธีรภัทร ชาญวิทย์',
          amount: 799,
          refId: `SCB${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          dateStr: pastTimestamp
        }),
        slipTimestamp: pastTimestamp,
        createdAt: pastTime.toISOString(),
        notes: 'เคสทดสอบรอดำเนินการเกิน 48 ชม. (ด่วนพิเศษ)'
      };
    } else {
      const id = `TEST-V1-${Date.now().toString().slice(-4)}`;
      const ticketCode = `GRAD69-T07S05-${Math.floor(10 + Math.random() * 90)}`;
      newCase = {
        id,
        mainBooker: 'พว. ภัทรพล สิทธิโชค',
        phone: '086-333-7788',
        email: 'pattarapol.s@kku.ac.th',
        category: 'graduate',
        academicYear: '2569',
        guestCount: 1,
        totalAmount: 799,
        guests: [
          {
            id: `${id}-g1`,
            name: 'พว. ภัทรพล สิทธิโชค',
            category: 'graduate',
            phone: '086-333-7788',
            email: 'pattarapol.s@kku.ac.th',
            table: 7,
            seat: 5,
            ticketCode
          }
        ],
        assignments: { 0: { table: 7, seat: 5 } },
        status: 'verified',
        slipUrl: generateRealisticSlipDataUrl({
          bank: 'SCB',
          bookerName: 'พว. ภัทรพล สิทธิโชค',
          amount: 799,
          refId: `SCB${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          dateStr: timestamp
        }),
        slipTimestamp: timestamp,
        createdAt: timestamp,
      };

      if (onAddManualSeat) {
        onAddManualSeat({
          table: 7,
          seat: 5,
          guestName: 'พว. ภัทรพล สิทธิโชค',
          category: 'graduate',
          phone: '086-333-7788',
          email: 'pattarapol.s@kku.ac.th',
          ticketCode,
          checkedIn: false
        });
      }
    }

    const updated = [newCase, ...testCases];
    saveTestCases(updated);
    alert(`✓ เพิ่มเคสทดสอบ ${newCase.id} (${newCase.mainBooker}) เรียบร้อยแล้ว!`);
  };

  const handleClearTestCases = () => {
    if (window.confirm('ต้องการล้างเคสทดสอบของเจ้าหน้าที่ทั้งหมดหรือไม่?')) {
      saveTestCases([]);
    }
  };

  // Staff Approval & Ticket Generation Handler
  const handleApproveReservation = (res: ReservationRecord) => {
    // 1. Update in parent
    if (onUpdateReservationStatus) {
      onUpdateReservationStatus(res.id, 'verified');
    }
    if (onUpdateReservation) {
      onUpdateReservation({ ...res, status: 'verified' });
    }
    // 2. Update if in testCases
    if (testCases.some(tc => tc.id === res.id)) {
      const updated = testCases.map(tc => tc.id === res.id ? { ...tc, status: 'verified' as const } : tc);
      saveTestCases(updated);
    }
    // 3. Register seats to existingSeats so QR check-in and floor plan see them
    if (onAddManualSeat && res.guests && res.guests.length > 0) {
      res.guests.forEach((g, idx) => {
        const table = g.table || (res.assignments && res.assignments[idx]?.table);
        const seat = g.seat || (res.assignments && res.assignments[idx]?.seat);
        if (table && seat) {
          const code = g.ticketCode || `GRAD69-T${String(table).padStart(2, '0')}S${String(seat).padStart(2, '0')}`;
          onAddManualSeat({
            table,
            seat,
            guestName: g.name,
            category: g.category,
            phone: g.phone || res.phone,
            email: g.email || res.email,
            ticketCode: code,
            checkedIn: false
          });
        }
      });
    }
    // 4. Send immediate approval email (Resend Edge Function + Local Logger)
    sendImmediateApprovalEmail(res);
    setEmailLogs(getEmailDispatchLogs());
    dispatchTicketEmail(res.id, 'send-ticket-pass')
      .then(emailRes => {
        console.log('Ticket email dispatch result:', emailRes);
      })
      .catch(err => {
        console.warn('Ticket email notice:', err.message);
      });

    alert(`✓ อนุมัติสลิปและออกบัตรดิจิทัลเรียบร้อยแล้ว!\nระบบได้ส่งคำสั่งส่งอีเมลบัตร Digital Gala Pass พร้อม QR Code ไปยัง ${res.email || 'ผู้ร่วมงาน'}`);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Table', 'Seat', 'Guest Name', 'Category', 'Phone', 'Email', 'Ticket Code', 'Check-In Status', 'Price (THB)'];
    const rows = existingSeats.map(s => [
      `Table ${s.table}`,
      `Seat ${s.seat}`,
      `"${s.guestName.replace(/"/g, '""')}"`,
      s.category,
      s.phone || '',
      s.email || '',
      s.ticketCode || '',
      s.checkedIn ? 'Checked-In' : 'Pending',
      TICKET_PRICE
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `grad69_guest_list_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -------------------------------------------------------------
  // LOGIN SCREEN
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-16 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-8 border-2 border-amber-400/50 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="text-center space-y-3 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8 text-amber-400" />
            </div>

            <div>
              <span className="text-[11px] font-bold tracking-widest text-amber-300 uppercase block">
                FACULTY OF NURSING KKU · 2569
              </span>
              <h2 className="font-serif-thai text-2xl font-bold text-white mt-1">
                ช่อง ระบบเจ้าหน้าที่: ตรวจสอบ · อนุมัติ · เเก้ไข
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                ระบบเจ้าหน้าที่ตรวจสอบการโอนเงินก่อนค่อยอนุมัติให้เลือกที่นั่ง · สิทธิ์แก้ไขได้ทุกอย่าง
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 pt-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-amber-200 mb-1.5">
                  รหัสผ่านเจ้าหน้าที่ (Passcode)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    autoFocus
                    value={passcodeInput}
                    onChange={e => {
                      setPasscodeInput(e.target.value);
                      setPasscodeError('');
                    }}
                    placeholder="ป้อนรหัส PIN (เริ่มต้น: 2569)"
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-amber-500/40 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                {passcodeError && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{passcodeError}</span>
                  </p>
                )}
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200/90">
                <span>💡 <strong>รหัสผ่านเริ่มต้น:</strong> </span>
                <button
                  type="button"
                  onClick={() => {
                    setPasscodeInput(DEFAULT_ADMIN_PASSCODE);
                    setPasscodeError('');
                  }}
                  className="font-mono font-bold text-amber-300 underline cursor-pointer hover:text-white"
                >
                  2569
                </button>
                <span> (คลิกเพื่อใส่รหัสอัตโนมัติ)</span>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>เข้าสู่ระบบเจ้าหน้าที่ (ตรวจสอบ · อนุมัติ · แก้ไข)</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // AUTHENTICATED FULL ADMIN DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="max-w-6xl mx-auto mb-16 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-amber-500/40 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>STAFF CONSOLE · แก้ไขได้ทุกอย่าง (FULL CONTROL)</span>
            </div>
            <h2 className="font-serif-thai text-2xl sm:text-3xl font-bold text-amber-100">
              ช่อง ระบบเจ้าหน้าที่: ตรวจสอบ · อนุมัติ · เเก้ไข
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              ตรวจสอบการโอนเงินก่อนค่อยอนุมัติให้เลือกที่นั่ง · แก้ไขข้อมูลผู้จอง & ที่นั่งได้ทุกส่วน · สลับที่นั่งทันที
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPasscodeChangeModal(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-medium border border-amber-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>เปลี่ยนรหัสผ่าน Admin</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-2 bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>

        {/* 3 Pillars Visual Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-6">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-amber-300 block">1. ตรวจสอบ (Verify)</span>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                ตรวจยอดโอน 799 บ./คน เข้าบัญชี SCB 5514261851 (นายชยณัฐ / น.ส.สุมาลี)
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-emerald-300 block">2. อนุมัติ (Approve)</span>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                กดยืนยันอนุมัติ 1-คลิก เพื่อปลดล็อคให้ผู้จองเข้าเลือกโต๊ะ 1-15 และเก้าอี้
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-indigo-300 block">3. แก้ไขได้ทุกอย่าง (Full Edit)</span>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                แก้ไขข้อมูลผู้จอง, เบอร์โทร, รายชื่อผู้ร่วมงาน, สลับเก้าอี้, ย้ายโต๊ะ, ยกเลิกที่นั่ง
              </p>
            </div>
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
              อัตราท่านละ 799 บาท
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-600/40">
            <div className="flex items-center justify-between text-xs text-amber-300 mb-1">
              <span>สลิปรอเจ้าหน้าที่ตรวจ</span>
              <FileCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-300 font-serif-thai tabular-nums">
              {pendingSlipsCount} รายการ
            </div>
            <div className="text-[11px] text-amber-400/80 mt-1">
              {pendingSlipsCount > 0 ? 'คลิกแท็บสลิปเพื่อตรวจอนุมัติ' : 'ตรวจสอบครบถ้วนแล้ว'}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('slips')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'slips'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>คิวตรวจสลิป & การจอง</span>
            {pendingSlipsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {pendingSlipsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('docs')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'docs'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>📑 เอกสารแนบทั้งหมด</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 text-[10px] font-bold border border-amber-400/40">
              {allAttachedDocs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'roster'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>รายชื่อ & แก้ไขที่นั่ง ({existingSeats.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('floorplan')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'floorplan'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>ผังจัดที่นั่งโดยเจ้าหน้าที่</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('addGuest')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'addGuest'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>เพิ่ม Walk-in โดยเจ้าหน้าที่</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEmailLogs(getEmailDispatchLogs());
              setActiveTab('emails');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'emails'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>ระบบส่งเมลทันที & เตือน 24 ชม.</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>ส่งออก CSV & ตั้งค่า</span>
          </button>
        </div>
      </div>

      {passcodeSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{passcodeSuccessMsg}</span>
        </div>
      )}

      {/* ================= TAB 1: SLIPS & RESERVATION EDIT ================= */}
      {activeTab === 'slips' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-500/20 shadow-xl space-y-6">
          {/* Staff Test Sandbox Panel */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-2 border-amber-400/60 shadow-xl text-white space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shrink-0">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-300 text-sm sm:text-base flex items-center gap-2">
                    <span>🧪 ปุ่มทดสอบเคสสำหรับเจ้าหน้าที่</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold uppercase">
                      Staff Test Sandbox
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    คลิกเพื่อจำลองการจองและสลิปจริงความละเอียดสูงสำหรับทดสอบตรวจสอบ, อนุมัติออกบัตร, และสแกน QR Code Check-in
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                {onStartTestRegistration && (
                  <button
                    type="button"
                    onClick={onStartTestRegistration}
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0"
                    title="เปิดขั้นตอนการลงทะเบียนเสมือนผู้ใช้งานจริง (ไม่แตะฐานข้อมูลจริง)"
                  >
                    <FlaskConical className="w-4 h-4 text-slate-950" />
                    <span>ทดลองลงทะเบียน (Simulation Mode)</span>
                  </button>
                )}

                {testCases.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearTestCases}
                    className="px-3 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ล้างเคสทดสอบ ({testCases.length})</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleAddTestCase('pending_single')}
                className="p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-amber-500/40 hover:border-amber-400 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-amber-400">เคสที่ 1 · 1 ที่นั่ง (799฿)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 font-semibold border border-amber-700/50">รอตรวจ</span>
                </div>
                <div className="font-semibold text-xs text-slate-200 group-hover:text-amber-200">
                  พว. ชลธิชา (สลิป SCB)
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  โต๊ะ 3 ที่นั่ง 4 · มีสลิปพร้อมเปิดดู
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAddTestCase('pending_multi')}
                className="p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-sky-500/40 hover:border-sky-400 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-sky-400">เคสที่ 2 · 3 ที่นั่ง (2,397฿)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 font-semibold border border-amber-700/50">รอตรวจ</span>
                </div>
                <div className="font-semibold text-xs text-slate-200 group-hover:text-sky-200">
                  ดร. กิตติพงษ์ (สลิป KBANK)
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  โต๊ะ 5 ที่นั่ง 1-3 · กลุ่ม 3 ท่าน
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAddTestCase('pending_overdue' as any)}
                className="p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-rose-500/40 hover:border-rose-400 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-rose-400">เคสที่ 3 · รอเกิน 48 ชม.</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 font-semibold border border-rose-700/50 animate-pulse">ด่วน 48h+</span>
                </div>
                <div className="font-semibold text-xs text-slate-200 group-hover:text-rose-200">
                  พว. ธีรภัทร (ค้าง 52 ชม.)
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  โต๊ะ 4 ที่นั่ง 1 · ป้ายเตือนด่วน
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleAddTestCase('verified_single')}
                className="p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-emerald-500/40 hover:border-emerald-400 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-emerald-400">เคสที่ 4 · อนุมัติแล้ว (799฿)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-semibold border border-emerald-700/50">บัตรพร้อม</span>
                </div>
                <div className="font-semibold text-xs text-slate-200 group-hover:text-emerald-200">
                  พว. ภัทรพล (พร้อมสแกน)
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  โต๊ะ 7 ที่นั่ง 5 · ทดสอบ Check-in ทันที
                </div>
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-serif-thai text-xl font-bold text-slate-900">
                คิวตรวจสอบสลิปโอนเงินและการจอง ({filteredReservations.length} รายการ)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                เจ้าหน้าที่สามารถเปิดดูสลิปความละเอียดสูง, อนุมัติสิทธิ์ออกบัตรดิจิทัล, แก้ไขข้อมูลผู้จองทั้งหมด, หรือจัดที่นั่งให้ได้ทันที
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'pending', label: 'รอตรวจ' },
                {
                  id: 'pendingOver48h',
                  label: `⏳ รอตรวจเกิน 48 ชม. (${overduePendingCount})`,
                  isUrgent: true,
                  count: overduePendingCount
                },
                { id: 'verified', label: 'อนุมัติแล้ว' },
                { id: 'rejected', label: 'ปฏิเสธ' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSlipFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    slipFilter === f.id
                      ? f.isUrgent
                        ? 'bg-rose-600 text-white font-bold ring-2 ring-rose-400'
                        : 'bg-amber-500 text-slate-950 font-bold'
                      : f.isUrgent && f.count && f.count > 0
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300 font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredReservations.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-500 text-xs sm:text-sm">
                ไม่พบรายการสลิปตามเงื่อนไขที่เลือก
              </div>
            ) : (
              filteredReservations.map(res => {
                const hasAssignedSeats = res.assignments && Object.keys(res.assignments).length > 0;
                const docs = getReservationDocuments(res);
                const { isOverdue, hoursAgo } = isPendingOver48Hours(res);

                return (
                  <div
                    key={res.id}
                    className={`p-5 rounded-2xl border-2 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      isOverdue
                        ? 'border-rose-400 bg-rose-50/50 ring-2 ring-rose-400/40 shadow-md shadow-rose-500/10'
                        : res.status === 'pending'
                        ? 'border-amber-300 bg-amber-50/40 ring-1 ring-amber-400/20'
                        : res.status === 'verified'
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : 'border-rose-200 bg-rose-50/20'
                    }`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
                      {/* Thumbnails of All Attached Documents */}
                      <div className="flex items-center gap-2 shrink-0">
                        {docs.map((doc, docIdx) => (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => handleOpenDocumentViewer(res, docIdx)}
                            className="w-16 sm:w-20 h-22 sm:h-26 rounded-xl overflow-hidden border-2 border-amber-400/50 shadow-md bg-slate-900 hover:opacity-90 relative group cursor-pointer"
                            title={`เปิดดู ${doc.name}`}
                          >
                            {doc.mimeType === 'application/pdf' || doc.name.toLowerCase().endsWith('.pdf') || doc.url.includes('application/pdf') ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-950 via-slate-900 to-red-900 p-1 text-center">
                                <FileText className="w-6 h-6 text-red-400 mb-0.5" />
                                <span className="text-[8px] font-bold text-red-200 tracking-wider">PDF</span>
                              </div>
                            ) : (
                              <img
                                src={doc.url}
                                alt={doc.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] transition-opacity font-semibold p-1 text-center">
                              <Eye className="w-4 h-4 text-amber-400 mb-0.5" />
                              <span>{doc.type === 'slip' ? 'สลิป' : 'ใบยืนยัน'}</span>
                            </div>
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-900/90 text-amber-300 text-[9px] font-bold font-mono">
                              #{docIdx + 1}
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {res.id}
                          </span>

                          {isOverdue && (
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-rose-600 text-white animate-pulse flex items-center gap-1 shadow-sm border border-rose-700">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>รอดำเนินการเกิน 48 ชม. ({hoursAgo} ชม. - ด่วน)</span>
                            </span>
                          )}

                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                              res.status === 'pending'
                                ? isOverdue
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                                : res.status === 'verified'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {res.status === 'pending'
                              ? '⏳ รอเจ้าหน้าที่ตรวจสอบ'
                              : res.status === 'verified'
                              ? '✓ อนุมัติแล้ว'
                              : '✕ ปฏิเสธสลิป'}
                          </span>

                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold flex items-center gap-1">
                            <Paperclip className="w-3 h-3" />
                            <span>เอกสารแนบ {docs.length} ไฟล์</span>
                          </span>

                          {hasAssignedSeats ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                              จัดที่นั่งแล้ว
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                              ยังไม่ได้เลือกที่นั่ง
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-slate-900 text-base">
                          {res.mainBooker}
                        </h4>

                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                          <span>โทร: <strong className="text-slate-700">{res.phone}</strong></span>
                          <span>อีเมล: <strong className="text-slate-700">{res.email || '-'}</strong></span>
                          <span>จำนวน: <strong className="text-slate-700">{res.guestCount} ท่าน</strong></span>
                          <span>ยอดเงิน: <strong className="text-amber-800 font-serif-thai text-sm font-bold">{(res.guestCount * TICKET_PRICE).toLocaleString('th-TH')} บาท</strong></span>
                        </div>

                        <div className="text-[11px] text-slate-400 pt-1">
                          ส่งเมื่อ: {res.slipTimestamp || res.createdAt}
                        </div>
                      </div>
                    </div>

                    {/* Actions for this Slip / Reservation (ช่อง ระบบเจ้าหน้าที่ ตรวจสอบ · อนุมัติ · เเก้ไข) */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenDocumentViewer(res, 0)}
                        className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-slate-950" />
                        <span>1. เปิดดูเอกสารทั้งหมด ({docs.length})</span>
                      </button>

                      {res.status !== 'verified' ? (
                        <button
                          type="button"
                          onClick={() => handleApproveReservation(res)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>2. อนุมัติ & ออกบัตรให้ผู้ร่วมงาน</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>อนุมัติ & ส่งเมลทันทีแล้ว</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              trigger24hReminderEmail(res);
                              setEmailLogs(getEmailDispatchLogs());
                              alert(`✓ จำลองส่งอีเมลแจ้งเตือนล่วงหน้า 24 ชม. ไปยัง ${res.email || 'ผู้จอง'} สำเร็จเรียบร้อยแล้ว!\nกำหนดการจริง: 20 ธ.ค. 2569 เวลา 18:00 น. (ก่อนเริ่มงาน 21 ธ.ค. 18.00 - 22.00 น.)`);
                            }}
                            className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            title="ทดสอบจำลองส่งอีเมลแจ้งเตือนก่อนงาน 24 ชม. ไปยังผู้จอง"
                          >
                            <Clock className="w-3.5 h-3.5 text-sky-600" />
                            <span>ทดสอบเตือน 24h</span>
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEditReservation(res)}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        <span>3. แก้ไขข้อมูลทั้งหมด</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenAssignGroupSeating(res)}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold shadow flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>จัดที่นั่งให้กลุ่ม</span>
                      </button>

                      {res.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => {
                            const reason = window.prompt('ระบุเหตุผลที่ปฏิเสธสลิป (เช่น สลิปไม่ชัด, ยอดเงินไม่ครบ 799 บาท):', 'ยอดเงินไม่ถูกต้องหรือไม่พบลำดับการโอน');
                            if (reason !== null) {
                              if (onUpdateReservation) {
                                onUpdateReservation({ ...res, status: 'rejected', rejectionReason: reason });
                              } else if (onUpdateReservationStatus) {
                                onUpdateReservationStatus(res.id, 'rejected');
                              }
                            }
                          }}
                          className="px-2.5 py-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                          title="ปฏิเสธสลิปนี้"
                        >
                          <span>ปฏิเสธ</span>
                        </button>
                      )}

                      {onDeleteReservation && (
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingReservation(res);
                            setDeleteConfirmText('');
                          }}
                          className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="ลบผู้ลงทะเบียนจริง (เซิร์ฟเวอร์)"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>ลบผู้ลงทะเบียน</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ================= TAB: ATTACHED DOCUMENTS GALLERY (📑 เอกสารแนบทั้งหมด) ================= */}
      {activeTab === 'docs' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-500/20 shadow-xl space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-amber-600" />
                <h3 className="font-serif-thai text-xl font-bold text-slate-900">
                  คลังเอกสารแนบทั้งหมด (Attached Documents Gallery)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
                  {filteredDocs.length} ฉบับ
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                เปิดดูสลิปและเอกสารแนบจริง (รองรับทั้งไฟล์ PDF และรูปภาพ JPG, JPEG, PNG) พร้อมปุ่มดาวน์โหลดไฟล์ต้นฉบับ
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDocViewMode('grid')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  docViewMode === 'grid'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>มุมมองการ์ด</span>
              </button>
              <button
                type="button"
                onClick={() => setDocViewMode('table')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  docViewMode === 'table'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>มุมมองตาราง</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาตามชื่อผู้จอง, เบอร์โทร, รหัสจอง, หรือชื่อเอกสาร..."
                value={docSearchTerm}
                onChange={e => setDocSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
              />
              {docSearchTerm && (
                <button
                  type="button"
                  onClick={() => setDocSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={docTypeFilter}
                onChange={e => setDocTypeFilter(e.target.value as any)}
                className="px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-700 font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="all">ชนิดเอกสาร: ทั้งหมด</option>
                <option value="slip">สลิปโอนเงิน (Slip)</option>
                <option value="voucher">หนังสือยืนยันการจอง (Voucher)</option>
              </select>

              <select
                value={docStatusFilter}
                onChange={e => setDocStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-700 font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="all">สถานะ: ทั้งหมด</option>
                <option value="pending">⏳ รอตรวจสอบ</option>
                <option value="verified">✓ อนุมัติแล้ว</option>
                <option value="rejected">✕ ปฏิเสธ</option>
              </select>
            </div>
          </div>

          {/* Document Content */}
          {filteredDocs.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-600 text-sm">ไม่พบเอกสารที่ตรงกับเงื่อนไขการค้นหา</p>
              <p className="text-xs text-slate-400 mt-1">ลองล้างตัวกรองหรือเปลี่ยนคำค้นหา</p>
            </div>
          ) : docViewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDocs.map((doc) => {
                const isPdf = doc.mimeType === 'application/pdf' || doc.url.includes('.pdf') || doc.name.toLowerCase().endsWith('.pdf');
                const parentRes = allReservations.find(r => r.id === doc.reservationId);

                return (
                  <div
                    key={doc.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {/* Thumbnail Header */}
                      <div className="relative bg-slate-900 h-44 flex items-center justify-center p-3 overflow-hidden border-b border-slate-100">
                        {isPdf ? (
                          <div className="text-center p-4 space-y-2">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/30 text-red-400 flex items-center justify-center mx-auto border border-red-500/40">
                              <FileText className="w-8 h-8 text-red-400" />
                            </div>
                            <span className="text-xs font-bold text-white block truncate max-w-[200px]">
                              {doc.name}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-300 font-mono font-bold">
                              PDF DOCUMENT
                            </span>
                          </div>
                        ) : (
                          <img
                            src={doc.url}
                            alt={doc.name}
                            className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                          />
                        )}

                        <div className="absolute top-2.5 right-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded shadow ${
                            doc.reservationStatus === 'verified'
                              ? 'bg-emerald-600 text-white'
                              : doc.reservationStatus === 'pending'
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-rose-600 text-white'
                          }`}>
                            {doc.reservationStatus === 'verified'
                              ? 'อนุมัติแล้ว'
                              : doc.reservationStatus === 'pending'
                              ? 'รอตรวจ'
                              : 'ปฏิเสธ'}
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-bold text-amber-700">
                            {doc.reservationId}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {doc.uploadedAt}
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-900 text-sm truncate">
                          {doc.bookerName}
                        </h4>

                        <div className="text-[11px] text-slate-500 space-y-0.5">
                          <div>โทร: <strong className="text-slate-700">{doc.phone}</strong></div>
                          <div>เอกสาร: <span className="text-slate-700 font-medium truncate block">{doc.name}</span></div>
                          <div>ยอดเงิน: <strong className="text-amber-800 font-bold">{doc.totalAmount.toLocaleString()} บาท</strong> ({doc.guestCount} ท่าน)</div>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (parentRes) {
                            handleOpenDocumentViewer(parentRes, doc.type === 'voucher' ? 1 : 0);
                          }
                        }}
                        className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>เปิดดูเอกสาร</span>
                      </button>

                      {doc.hasRealFile && doc.url && (
                        <button
                          type="button"
                          onClick={() => downloadFileFromUrl(doc.url, doc.name || 'document')}
                          className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl transition-colors cursor-pointer"
                          title="ดาวน์โหลดไฟล์ต้นฉบับ"
                        >
                          <Download className="w-4 h-4 text-slate-700" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">ชนิดเอกสาร</th>
                    <th className="p-3">ผู้จองหลัก</th>
                    <th className="p-3">รหัสจอง</th>
                    <th className="p-3">เบอร์โทร</th>
                    <th className="p-3">ยอดชำระ</th>
                    <th className="p-3">สถานะ</th>
                    <th className="p-3 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDocs.map((doc) => {
                    const parentRes = allReservations.find(r => r.id === doc.reservationId);
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-slate-900 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="truncate max-w-[200px]">{doc.name}</span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">{doc.bookerName}</td>
                        <td className="p-3 font-mono font-bold text-amber-700">{doc.reservationId}</td>
                        <td className="p-3">{doc.phone}</td>
                        <td className="p-3 font-bold text-amber-800">{doc.totalAmount.toLocaleString()} ฿</td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            doc.reservationStatus === 'verified'
                              ? 'bg-emerald-100 text-emerald-800'
                              : doc.reservationStatus === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {doc.reservationStatus === 'verified' ? 'อนุมัติแล้ว' : doc.reservationStatus === 'pending' ? 'รอตรวจ' : 'ปฏิเสธ'}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (parentRes) {
                                handleOpenDocumentViewer(parentRes, doc.type === 'voucher' ? 1 : 0);
                              }
                            }}
                            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold rounded-lg text-xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>เปิดดู</span>
                          </button>
                          {doc.hasRealFile && doc.url && (
                            <button
                              type="button"
                              onClick={() => downloadFileFromUrl(doc.url, doc.name || 'document')}
                              className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                              title="ดาวน์โหลดไฟล์ต้นฉบับ"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: ROSTER & SEAT MANAGEMENT ================= */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-500/20 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <h3 className="font-serif-thai text-xl font-bold text-slate-900">
                รายชื่อผู้เข้าร่วมงานและการจัดสรรที่นั่ง ({filteredSeats.length} ที่นั่ง)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                คลิกแก้ไขเพื่อเปลี่ยนชื่อ, ประเภท, โต๊ะ (1-12), เก้าอี้ (1-8), หรือสลับที่นั่งได้ทันที
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Table filter dropdown */}
              <select
                value={selectedTableFilter}
                onChange={e => setSelectedTableFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white outline-none"
              >
                <option value="all">ทุกโต๊ะ (1–12)</option>
                {TABLES.map(t => (
                  <option key={t.id} value={t.id}>
                    โต๊ะ {t.id} ({t.name})
                  </option>
                ))}
              </select>

              {/* Check-in status filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white outline-none"
              >
                <option value="all">ทุกสถานะ Check-in</option>
                <option value="checkedIn">Check-in แล้ว</option>
                <option value="notCheckedIn">ยังไม่ Check-in</option>
              </select>
            </div>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อผู้ร่วมงาน, รหัสบัตร, หรือเบอร์โทร..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Table list */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                <tr>
                  <th className="py-3 px-4">โต๊ะ/ที่นั่ง</th>
                  <th className="py-3 px-4">ชื่อ–นามสกุล</th>
                  <th className="py-3 px-4">ประเภท</th>
                  <th className="py-3 px-4">รหัสบัตร</th>
                  <th className="py-3 px-4 text-center">Check-in</th>
                  <th className="py-3 px-4 text-right">การจัดการเจ้าหน้าที่</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSeats.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      ไม่พบข้อมูลที่นั่งตามที่ค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredSeats.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <span className="px-2 py-1 rounded-lg bg-slate-900 text-amber-300 text-xs">
                          T{s.table} · เก้าอี้ {s.seat}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{s.guestName}</div>
                        {s.phone && <div className="text-[11px] text-slate-500">{s.phone}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                            s.category === 'faculty'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : s.category === 'graduate'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : s.category === 'agn5'
                              ? 'bg-sky-100 text-sky-800 border border-sky-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {s.category === 'faculty'
                            ? 'อาจารย์ (1–2)'
                            : s.category === 'graduate'
                            ? 'บัณฑิต (3–9)'
                            : s.category === 'agn5'
                            ? 'AGN5 (10–12)'
                            : 'แขกร่วมงาน'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">
                        {s.ticketCode || `GRAD69-T${String(s.table).padStart(2, '0')}S${String(s.seat).padStart(2, '0')}`}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleCheckIn(s.table, s.seat)}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            s.checkedIn
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {s.checkedIn ? '✓ เข้างานแล้ว' : 'รอเข้างาน'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-amber-800 hover:bg-amber-50 transition-colors"
                            title="แก้ไขข้อมูลที่นั่งนี้"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenSwap(s)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-800 hover:bg-indigo-50 transition-colors"
                            title="สลับที่นั่งกับท่านอื่น"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedTicketSeat(s)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                            title="ดูบัตรเกียรติยศ Digital Pass"
                          >
                            <Ticket className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSeat(s)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="ยกเลิก/คืนที่ว่าง"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: STAFF SEATING FLOOR PLAN ================= */}
      {activeTab === 'floorplan' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-500/20 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                  ผังห้องจัดเลี้ยง 12 โต๊ะ (96 ที่นั่ง)
                </span>
                <span className="text-xs text-slate-400">· โต๊ะละ 8 ที่นั่ง</span>
              </div>
              <h3 className="font-serif-thai text-xl font-bold text-slate-900 mt-1">
                ผังจัดที่นั่งโดยเจ้าหน้าที่ (Interactive Staff Floor Plan)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                จัดวางตามผังจริง: โต๊ะ 1–2 อาจารย์ · โต๊ะ 3–9 บัณฑิต · โต๊ะ 10–12 AGN5 (คลิกเก้าอี้เพื่อแก้ไขหรือเพิ่มผู้ร่วมงาน)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-600" /> โต๊ะ 1–2 อาจารย์</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-400 border border-blue-600" /> โต๊ะ 3–9 บัณฑิต</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-sky-400 border border-sky-600" /> โต๊ะ 10–12 AGN5</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-200 border border-dashed border-emerald-500" /> เก้าอี้ว่าง</span>
            </div>
          </div>

          {/* Diagram Layout mirroring /public/assets/aistudio/image_61decdba.png */}
          <div className="bg-slate-950 rounded-3xl p-4 sm:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
            {/* Background lighting */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-amber-500/10 blur-3xl pointer-events-none" />

            {/* STAGE (เวที สมมติ) */}
            <div className="max-w-md mx-auto mb-8">
              <div className="py-3 px-6 rounded-2xl bg-gradient-to-r from-slate-800 via-amber-950 to-slate-800 border-2 border-amber-500/50 text-center shadow-lg shadow-amber-500/10">
                <span className="text-[10px] tracking-widest text-amber-400 font-bold uppercase block">FRONT STAGE</span>
                <span className="font-serif-thai text-lg sm:text-xl font-bold text-amber-200">เวที (สมมติ)</span>
              </div>
            </div>

            {/* Helper renderer for a single table card in Staff Floor Plan */}
            {(() => {
              const renderStaffTable = (tableId: number) => {
                const tableInfo = TABLES.find(t => t.id === tableId);
                const tableSeats = existingSeats.filter(s => s.table === tableId);
                const isFaculty = tableId === 1 || tableId === 2;
                const isAGN5 = tableId >= 10 && tableId <= 12;

                const zoneName = isFaculty ? 'อาจารย์' : isAGN5 ? 'AGN5' : 'บัณฑิต';

                // Colors matching image_61decdba.png
                const tableBg = isFaculty
                  ? 'bg-[#e5c583] border-[#8a6520] text-[#3e2704]'
                  : isAGN5
                  ? 'bg-[#9ec5ef] border-[#2c5f94] text-[#0a2749]'
                  : 'bg-[#accef2] border-[#3a699b] text-[#0d2a4e]';

                const angles = [0, 45, 90, 135, 180, 225, 270, 315];

                return (
                  <div
                    key={tableId}
                    className="flex flex-col items-center justify-center p-2 rounded-2xl transition-all group relative"
                  >
                    {/* Authentic Round Table Container */}
                    <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center">
                      {/* 8 Radial Chairs */}
                      {angles.map((angle, idx) => {
                        const seatNum = idx + 1;
                        const seatObj = tableSeats.find(s => s.seat === seatNum);
                        const isOccupied = !!seatObj;
                        const rad = (angle * Math.PI) / 180;
                        const radius = 54; // px from center
                        const x = Math.cos(rad) * radius;
                        const y = Math.sin(rad) * radius;

                        const chairStyle = isOccupied
                          ? seatObj.category === 'faculty'
                            ? 'bg-amber-400 text-slate-950 border-amber-600 font-bold'
                            : seatObj.category === 'agn5'
                            ? 'bg-sky-400 text-slate-950 border-sky-600 font-bold'
                            : 'bg-blue-500 text-white border-blue-700 font-bold'
                          : 'bg-slate-900/90 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-950';

                        return (
                          <button
                            key={seatNum}
                            type="button"
                            style={{
                              transform: `translate(${x}px, ${y}px) rotate(${angle}deg)`
                            }}
                            onClick={() => {
                              if (seatObj) {
                                handleOpenEdit(seatObj);
                              } else {
                                setAddTable(tableId);
                                setAddSeatNum(seatNum);
                                setActiveTab('addGuest');
                              }
                            }}
                            className={`absolute w-5 h-7 sm:w-6 sm:h-8 rounded-sm shadow-sm flex flex-col items-center justify-center text-[8px] sm:text-[9px] transition-all hover:scale-115 hover:z-30 cursor-pointer ${chairStyle}`}
                            title={
                              isOccupied
                                ? `โต๊ะ ${tableId} เก้าอี้ ${seatNum}: ${seatObj.guestName} (${seatObj.ticketCode || ''}) - คลิกแก้ไข`
                                : `โต๊ะ ${tableId} เก้าอี้ ${seatNum} (ว่าง) - คลิกเพื่อเพิ่มผู้ร่วมงาน`
                            }
                          >
                            <span className="leading-none">#{seatNum}</span>
                          </button>
                        );
                      })}

                      {/* Central Round Table Disc */}
                      <div
                        onClick={() => {
                          setSelectedTableFilter(tableId);
                          setActiveTab('roster');
                        }}
                        className={`relative z-10 w-22 h-22 sm:w-24 sm:h-24 rounded-full border-3 flex flex-col items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-105 ${tableBg}`}
                        title={`คลิกเพื่อดูรายชื่อทั้งโต๊ะ ${tableId}`}
                      >
                        <span className="font-serif-thai text-xl sm:text-2xl font-black leading-none drop-shadow-xs">
                          {tableId}
                        </span>
                        <span className="text-[11px] font-bold mt-0.5 tracking-tight">
                          {zoneName}
                        </span>
                        <span className="text-[9px] font-bold opacity-90 mt-0.5">
                          {tableSeats.length}/8 ที่
                        </span>
                      </div>
                    </div>

                    {/* Table Title Caption */}
                    <div className="mt-1 text-center">
                      <span className="text-xs font-bold text-slate-200">
                        โต๊ะ {tableId} ({zoneName})
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {tableSeats.length >= 8 ? (
                          <span className="text-rose-400 font-bold">เต็มแล้ว</span>
                        ) : (
                          <span className="text-emerald-400 font-semibold">ว่าง {8 - tableSeats.length} ที่</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              };

              return (
                <div className="relative">
                  {/* Central Walkway Column Guide (Desktop) */}
                  <div className="hidden lg:flex absolute inset-y-0 left-1/2 -translate-x-1/2 w-16 flex-col items-center justify-around py-4 pointer-events-none z-10 border-x border-dashed border-amber-500/20 bg-amber-500/5">
                    <span className="[writing-mode:vertical-rl] text-xs font-bold text-amber-300/80 tracking-widest uppercase">
                      ทางเดินกลาง
                    </span>
                    <span className="[writing-mode:vertical-rl] text-xs font-bold text-amber-300/80 tracking-widest uppercase">
                      CENTRAL AISLE
                    </span>
                    <span className="[writing-mode:vertical-rl] text-xs font-bold text-amber-300/80 tracking-widest uppercase">
                      ทางเดินกลาง
                    </span>
                  </div>

                  <div className="space-y-6 sm:space-y-8">
                    {/* ROW 1: Table 1 (Left - อาจารย์) | Walkway | Table 2 (Right - อาจารย์) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-20">
                      <div className="max-w-md mx-auto w-full">
                        {renderStaffTable(1)}
                      </div>
                      <div className="max-w-md mx-auto w-full">
                        {renderStaffTable(2)}
                      </div>
                    </div>

                    {/* Central Walkway indicator for mobile */}
                    <div className="lg:hidden py-1 text-center border-y border-dashed border-amber-500/30 bg-amber-500/5 text-amber-300/80 text-xs font-bold">
                      ↕ ทางเดินกลาง (Central Aisle) ↕
                    </div>

                    {/* ROW 2: Tables 3, 4 (Left - บัณฑิต) | Walkway | Tables 5, 6 (Right - บัณฑิต) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-20">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto w-full">
                        {renderStaffTable(3)}
                        {renderStaffTable(4)}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto w-full">
                        {renderStaffTable(5)}
                        {renderStaffTable(6)}
                      </div>
                    </div>

                    {/* ROW 3: Tables 7, 8 (Left - บัณฑิต) | Walkway | Table 9 (บัณฑิต), Table 10 (AGN5) (Right) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-20">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto w-full">
                        {renderStaffTable(7)}
                        {renderStaffTable(8)}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto w-full">
                        {renderStaffTable(9)}
                        {renderStaffTable(10)}
                      </div>
                    </div>

                    {/* ROW 4: Table 11 (Left - AGN5) | Walkway | Table 12 (Right - AGN5) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-20">
                      <div className="max-w-md mx-auto w-full">
                        {renderStaffTable(11)}
                      </div>
                      <div className="max-w-md mx-auto w-full">
                        {renderStaffTable(12)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ENTRANCE (ทางเข้า สมมติ) */}
            <div className="max-w-xs mx-auto mt-8 pt-4 border-t-2 border-dashed border-slate-700 text-center">
              <div className="py-2.5 px-6 rounded-xl bg-slate-900 border-2 border-indigo-400/50 shadow-md">
                <span className="font-serif-thai text-base font-bold text-indigo-300">
                  ทางเข้า (สมมติ)
                </span>
                <span className="text-[10px] text-slate-400 block">MAIN ENTRANCE</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: ADD WALK-IN GUEST ================= */}
      {activeTab === 'addGuest' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-500/20 shadow-xl max-w-2xl mx-auto space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="font-serif-thai text-xl font-bold text-slate-900">
              เพิ่มผู้เข้าร่วมงาน / ลงทะเบียน Walk-in โดยเจ้าหน้าที่
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              เจ้าหน้าที่สามารถจัดสรรที่นั่งว่างให้แก่ผู้เข้าร่วมงานได้โดยตรง พร้อมสร้างรหัสบัตรและ QR Code ทันที
            </p>
          </div>

          {addSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{addSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleAddWalkinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ชื่อ–นามสกุล ผู้เข้าร่วมงาน <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={addName}
                onChange={e => setAddName(e.target.value)}
                placeholder="เช่น นายปารเมศ โพธิ์ทอง"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  เบอร์โทรศัพท์
                </label>
                <input
                  type="tel"
                  value={addPhone}
                  onChange={e => setAddPhone(e.target.value)}
                  placeholder="08x-xxx-xxxx"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  อีเมล (สำหรับส่งบัตร)
                </label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ประเภทผู้ร่วมงาน
              </label>
              <select
                value={addCategory}
                onChange={e => setAddCategory(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="graduate">บัณฑิต ป.โท คณะพยาบาลศาสตร์ มข. (โต๊ะ 3–9)</option>
                <option value="faculty">คณาจารย์ / ผู้บริหาร (โต๊ะ 1–2)</option>
                <option value="agn5">กลุ่ม AGN5 (โต๊ะ 10–12)</option>
                <option value="guest">ครอบครัวและแขกผู้มีเกียรติ</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  เลือกโต๊ะ (1–12)
                </label>
                <select
                  value={addTable}
                  onChange={e => setAddTable(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  {TABLES.map(t => (
                    <option key={t.id} value={t.id}>
                      โต๊ะ {t.id} ({t.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  เลือกเก้าอี้ (1–8)
                </label>
                <select
                  value={addSeatNum}
                  onChange={e => setAddSeatNum(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => {
                    const occupied = existingSeats.some(es => es.table === addTable && es.seat === s);
                    return (
                      <option key={s} value={s} disabled={occupied}>
                        เก้าอี้ที่ {s} {occupied ? '(ไม่ว่าง)' : '(ว่าง)'}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="flex justify-between font-semibold">
                <span>อัตราค่าลงทะเบียน:</span>
                <span>799 บาท</span>
              </div>
              <p className="text-[11px] text-amber-800">
                เมื่อบันทึกแล้วระบบจะออกรหัสบัตรและพร้อมพิมพ์บัตรดิจิทัลทันที
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>ยืนยันเพิ่มผู้เข้าร่วมและจัดที่นั่ง</span>
            </button>
          </form>
        </div>
      )}

      {/* ================= TAB 5: AUTOMATED EMAILS & 24H REMINDER LOGS ================= */}
      {activeTab === 'emails' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-500/20 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-2">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                <span>AUTOMATED EMAIL DISPATCH & 24-HOUR REMINDERS</span>
              </div>
              <h3 className="font-serif-thai text-xl sm:text-2xl font-bold text-slate-900">
                ระบบจัดส่งอีเมลอัตโนมัติ (ส่งทันทีหลังอนุมัติ + แจ้งเตือนก่อนงาน 24 ชม.)
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                ระบบจัดส่งบัตร Digital Pass เข้ากล่องจดหมายผู้จองทันทีที่อนุมัติ และตั้งเวลาส่งแจ้งเตือนล่วงหน้า 24 ชม. (20 ธ.ค. 2569 เวลา 18:00 น.)
              </p>
            </div>

            <button
              type="button"
              onClick={() => setEmailLogs(getEmailDispatchLogs())}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-xl text-xs font-bold border border-amber-500/40 flex items-center gap-1.5 transition-colors cursor-pointer self-start md:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>รีเฟรชประวัติเมล (Refresh)</span>
            </button>
          </div>

          {/* 2 Automatic Email Policies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>1. ส่งอีเมลทันทีหลังจากอนุมัติบัตร (Immediate Pass)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pl-7">
                เมื่อเจ้าหน้าที่กดอนุมัติสลิป ระบบจะจัดส่งบัตรเกียรติยศดิจิทัล (Digital Gala Pass) ฉบับสมบูรณ์ พร้อมรหัส QR Code สำหรับสแกนเข้างาน และพิกัด Google Maps โรงแรมราชาวดี ขอนแก่น ไปยังอีเมลผู้จองทันทีโดยอัตโนมัติ
              </p>
              <div className="pl-7 pt-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                  ทำงานอัตโนมัติทันที
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2">
              <div className="flex items-center gap-2 text-sky-900 font-bold text-sm">
                <Clock className="w-5 h-5 text-sky-600 shrink-0" />
                <span>2. ส่งอีเมลแจ้งเตือนก่อนงาน 24 ชม. (24h Pre-Event Reminder)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pl-7">
                ระบบตั้งเวลาส่งอีเมลแจ้งเตือนล่วงหน้า 24 ชม. ในวันที่ <strong>20 ธันวาคม 2569 เวลา 18:00 น.</strong> (ก่อนวันงาน 21 ธ.ค. 2569 งานเริ่ม 18.00 - 22.00 น. ลงทะเบียน 17.30 น.) เพื่อเตือนให้ผู้ร่วมงานเตรียมบัตร Digital Pass และแนะนำการเดินทาง
              </p>
              <div className="pl-7 pt-1">
                <span className="px-2.5 py-0.5 rounded-full bg-sky-600 text-white text-[10px] font-bold">
                  กำหนดส่ง 20 ธ.ค. 2569 เวลา 18:00 น.
                </span>
              </div>
            </div>
          </div>

          {/* Email Logs Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm">
                บันทึกการจัดส่งและการตั้งเวลาแจ้งเตือน ({emailLogs.length} รายการ):
              </h4>
              <span className="text-xs text-slate-500">
                (บันทึกลงฐานข้อมูลและ LocalStorage เรียลไทม์)
              </span>
            </div>

            {emailLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
                ยังไม่มีประวัติการส่งอีเมล (จะเริ่มส่งอัตโนมัติเมื่อกดอนุมัติบัตรในแท็บ "คิวตรวจสลิป & การจอง")
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                    <tr>
                      <th className="py-3 px-3">ผู้รับ (ชื่อ & อีเมล)</th>
                      <th className="py-3 px-3">ประเภทอีเมล</th>
                      <th className="py-3 px-3">โต๊ะ/ที่นั่ง</th>
                      <th className="py-3 px-3">เวลาจัดส่ง / กำหนดการ</th>
                      <th className="py-3 px-3 text-center">สถานะ</th>
                      <th className="py-3 px-3 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {emailLogs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{log.recipientName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{log.recipientEmail}</div>
                        </td>
                        <td className="py-3 px-3">
                          {log.type === 'immediate_approval' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                              ส่งทันทีหลังอนุมัติ
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold text-[10px] border border-sky-300">
                              แจ้งเตือนก่อนงาน 24 ชม.
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">
                          โต๊ะ {log.table} · เก้าอี้ {log.seat}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {log.type === 'immediate_approval' ? (
                            <span>{log.sentAt}</span>
                          ) : (
                            <div>
                              <span className="block font-medium text-sky-900">{log.scheduledFor}</span>
                              <span className="text-[10px] text-slate-400">ส่งจริง: {log.sentAt}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {log.status === 'delivered' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                              ✓ ส่งถึงผู้รับแล้ว
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-[10px]">
                              ⏳ ตั้งเวลาล่วงหน้า
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const targetRes = reservations.find(r => r.id === log.reservationId) || {
                                id: log.reservationId,
                                mainBooker: log.recipientName,
                                phone: '089-123-4567',
                                email: log.recipientEmail,
                                category: 'graduate' as const,
                                academicYear: 'รุ่น 2569',
                                guestCount: 1,
                                guests: [{ id: '1', name: log.recipientName, category: 'graduate' as const }],
                                assignments: { 0: { table: log.table, seat: log.seat } },
                                totalAmount: 799,
                                slipTimestamp: '',
                                status: 'verified' as const,
                                createdAt: ''
                              };
                              trigger24hReminderEmail(targetRes);
                              setEmailLogs(getEmailDispatchLogs());
                              alert(`✓ จำลองส่งอีเมลแจ้งเตือนล่วงหน้า 24 ชม. ไปยัง ${log.recipientEmail} สำเร็จ!`);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            ⚡ ทดสอบส่งเตือน 24h
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 6: SETTINGS & EXPORT ================= */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-500/20 shadow-xl space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="font-serif-thai text-xl font-bold text-slate-900">
              การจัดการข้อมูลและตั้งค่าระบบ
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              ส่งออกรายงานผู้เข้าร่วมงาน เปลี่ยนรหัสผ่าน หรือล้างข้อมูลทดสอบ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export CSV Card */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">
                ดาวน์โหลดรายชื่อผู้เข้าร่วม (CSV)
              </h4>
              <p className="text-xs text-slate-500">
                ส่งออกไฟล์สรุปรายชื่อผู้เข้าร่วมงาน โต๊ะ เก้าอี้ และสถานะ Check-in สำหรับฝ่ายต้อนรับ
              </p>
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลด CSV ทันที</span>
              </button>
            </div>

            {/* Change Passcode Card */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">
                รหัสผ่านสำหรับเจ้าหน้าที่ (PIN)
              </h4>
              <p className="text-xs text-slate-500">
                รหัสผ่านปัจจุบันใช้สำหรับเข้าหน้านี้และยืนยันสลิปที่จุดบริการ
              </p>
              <button
                type="button"
                onClick={() => setShowPasscodeChangeModal(true)}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>เปลี่ยนรหัสผ่านเจ้าหน้าที่</span>
              </button>
            </div>

            {/* Reset Data Card */}
            <div className="col-span-1 md:col-span-2 p-6 rounded-2xl border border-rose-200 bg-rose-50/50 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-rose-950 text-base">
                ล้างข้อมูลการจองทั้งหมด (คืนที่นั่งว่าง 100%)
              </h4>
              <p className="text-xs text-rose-700">
                ฟังก์ชันสำหรับเคลียร์ข้อมูลการทดสอบทั้งหมด คืนโต๊ะจีนทั้ง 15 โต๊ะ (120 ที่นั่ง) ให้ว่างพร้อมเปิดรับจองใหม่
              </p>
              <button
                type="button"
                onClick={onResetData}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>ล้างข้อมูลการจองทั้งหมด</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT RESERVATION (เจ้าหน้าที่แก้ไขได้หมด) ================= */}
      {editingReservation && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-600" />
                <h3 className="font-serif-thai font-bold text-lg text-slate-900">
                  แก้ไขข้อมูลการจองทั้งหมด ({editingReservation.id})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingReservation(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFullReservation} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ–นามสกุล ผู้จองหลัก <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editResBooker}
                  onChange={e => setEditResBooker(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <input
                    type="tel"
                    value={editResPhone}
                    onChange={e => setEditResPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    อีเมล (สำหรับส่งบัตร)
                  </label>
                  <input
                    type="email"
                    value={editResEmail}
                    onChange={e => setEditResEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ประเภทผู้ร่วมงาน
                  </label>
                  <select
                    value={editResCategory}
                    onChange={e => setEditResCategory(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="graduate">บัณฑิต ป.โท คณะพยาบาลศาสตร์ มข. (โต๊ะ 3–9)</option>
                    <option value="faculty">คณาจารย์ / ผู้บริหาร (โต๊ะ 1–2)</option>
                    <option value="agn5">กลุ่ม AGN5 (โต๊ะ 10–12)</option>
                    <option value="guest">ครอบครัวและแขกผู้มีเกียรติ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    สถานะการตรวจสอบสลิป
                  </label>
                  <select
                    value={editResStatus}
                    onChange={e => setEditResStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none font-bold"
                  >
                    <option value="pending">⏳ รอการตรวจสอบ (ยังเลือกที่นั่งไม่ได้)</option>
                    <option value="verified">✓ อนุมัติแล้ว (ปลดล็อคที่นั่งแล้ว)</option>
                    <option value="rejected">✕ ปฏิเสธสลิป</option>
                  </select>
                </div>
              </div>

              {editResStatus === 'rejected' && (
                <div>
                  <label className="block text-xs font-semibold text-rose-700 mb-1">
                    เหตุผลที่ปฏิเสธสลิป
                  </label>
                  <input
                    type="text"
                    value={editResRejectionReason}
                    onChange={e => setEditResRejectionReason(e.target.value)}
                    placeholder="เช่น สลิปไม่ชัด, ยอดไม่ครบ 799 บาท"
                    className="w-full px-4 py-2.5 rounded-xl border border-rose-300 bg-rose-50 text-sm outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุ / ข้อจำกัดอาหาร (Notes)
                </label>
                <input
                  type="text"
                  value={editResNotes}
                  onChange={e => setEditResNotes(e.target.value)}
                  placeholder="เช่น มังสวิรัติ, แพ้อาหารทะเล"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none"
                />
              </div>

              {/* Edit Individual Guests & Direct Seating */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    รายชื่อผู้เข้าร่วมในกลุ่ม & ผังโต๊ะ-เก้าอี้ ({editResGuests.length} ท่าน):
                  </span>
                  <span className="text-[11px] text-slate-500">
                    เจ้าหน้าที่ระบุโต๊ะ 1-12 และเก้าอี้ 1-8 ได้ทันที
                  </span>
                </div>

                {editResGuests.map((g, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex gap-2 items-center">
                      <span className="text-xs font-bold text-slate-500 w-14 shrink-0">ท่านที่ {idx + 1}:</span>
                      <input
                        type="text"
                        value={g.name}
                        placeholder="ชื่อ–นามสกุล"
                        onChange={e => {
                          const copy = [...editResGuests];
                          copy[idx].name = e.target.value;
                          setEditResGuests(copy);
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                      <select
                        value={g.category}
                        onChange={e => {
                          const copy = [...editResGuests];
                          copy[idx].category = e.target.value as any;
                          setEditResGuests(copy);
                        }}
                        className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium"
                      >
                        <option value="graduate">บัณฑิต</option>
                        <option value="faculty">อาจารย์</option>
                        <option value="agn5">AGN5</option>
                        <option value="guest">แขก</option>
                      </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-14">
                      <span className="text-[11px] text-slate-500 shrink-0">ที่นั่ง:</span>
                      <select
                        value={g.table || 3}
                        onChange={e => {
                          const val = Number(e.target.value);
                          const copy = [...editResGuests];
                          copy[idx].table = val;
                          setEditResGuests(copy);
                        }}
                        className="px-2 py-1 rounded-lg border border-slate-300 text-xs bg-white font-medium"
                      >
                        {TABLES.map(t => (
                          <option key={t.id} value={t.id}>
                            โต๊ะ {t.id} ({t.name.split(' ')[0]})
                          </option>
                        ))}
                      </select>

                      <select
                        value={g.seat || (idx + 1)}
                        onChange={e => {
                          const val = Number(e.target.value);
                          const copy = [...editResGuests];
                          copy[idx].seat = val;
                          setEditResGuests(copy);
                        }}
                        className="px-2 py-1 rounded-lg border border-slate-300 text-xs bg-white font-medium"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                          <option key={s} value={s}>
                            เก้าอี้ {s}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={g.ticketCode || ''}
                        placeholder="รหัสบัตร (เช่น GRAD69-T03S01)"
                        onChange={e => {
                          const copy = [...editResGuests];
                          copy[idx].ticketCode = e.target.value;
                          setEditResGuests(copy);
                        }}
                        className="flex-1 min-w-[140px] px-2 py-1 rounded-lg border border-slate-300 text-[11px] font-mono bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                {onDeleteReservation && (
                  <button
                    type="button"
                    onClick={() => {
                      const resToDelete = editingReservation;
                      setEditingReservation(null);
                      setDeletingReservation(resToDelete);
                      setDeleteConfirmText('ยืนยันลบ');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="ลบผู้ลงทะเบียนและคืนที่นั่งทั้งหมด"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>ลบผู้ลงทะเบียนนี้</span>
                  </button>
                )}
                <div className="flex items-center gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => setEditingReservation(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>บันทึกการแก้ไขทั้งหมด</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DIRECT GROUP SEATING ASSIGN ================= */}
      {assigningReservation && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-amber-600" />
                <h3 className="font-serif-thai font-bold text-lg text-slate-900">
                  จัดสรรโต๊ะและที่นั่งให้กลุ่ม {assigningReservation.mainBooker}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssigningReservation(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroupSeating} className="space-y-4 pt-4">
              <p className="text-xs text-slate-500">
                เลือกโต๊ะ (1-12) และเก้าอี้ (1-8) สำหรับสมาชิกแต่ละท่านในกลุ่ม ({assigningReservation.guestCount} ท่าน):
              </p>

              <div className="space-y-3">
                {assigningReservation.guests.map((g, idx) => {
                  const currentPos = assignTableMap[idx] || { table: 3, seat: 1 };
                  return (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-xs font-bold text-slate-800">
                        {idx + 1}. {g.name}
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={currentPos.table}
                          onChange={e => {
                            setAssignTableMap(prev => ({
                              ...prev,
                              [idx]: { ...currentPos, table: Number(e.target.value) }
                            }));
                          }}
                          className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium"
                        >
                          {TABLES.map(t => (
                            <option key={t.id} value={t.id}>
                              โต๊ะ {t.id}
                            </option>
                          ))}
                        </select>

                        <select
                          value={currentPos.seat}
                          onChange={e => {
                            setAssignTableMap(prev => ({
                              ...prev,
                              [idx]: { ...currentPos, seat: Number(e.target.value) }
                            }));
                          }}
                          className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                            <option key={s} value={s}>
                              เก้าอี้ {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAssigningReservation(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>บันทึกที่นั่งและอนุมัติทันที</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: SEAT SWAPPER (สลับที่นั่ง) ================= */}
      {swappingSeat && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">
                  สลับที่นั่ง (Seat Swap)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSwappingSeat(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteSwap} className="space-y-4 pt-4">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <span>กำลังย้ายที่นั่งของ: </span>
                <strong>{swappingSeat.guestName}</strong>
                <div>ตำแหน่งปัจจุบัน: โต๊ะ {swappingSeat.table} · เก้าอี้ {swappingSeat.seat}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลือกตำแหน่งปลายทางที่จะย้าย / สลับ:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={swapTargetTable}
                    onChange={e => setSwapTargetTable(Number(e.target.value))}
                    className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium"
                  >
                    {TABLES.map(t => (
                      <option key={t.id} value={t.id}>
                        โต๊ะ {t.id} ({t.name})
                      </option>
                    ))}
                  </select>

                  <select
                    value={swapTargetSeat}
                    onChange={e => setSwapTargetSeat(Number(e.target.value))}
                    className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => {
                      const occupant = existingSeats.find(es => es.table === swapTargetTable && es.seat === s);
                      return (
                        <option key={s} value={s}>
                          เก้าอี้ {s} {occupant ? `(สลับกับ ${occupant.guestName.split(' ')[0]})` : '(ว่าง - ย้ายไปทันที)'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSwappingSeat(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>ยืนยันสลับที่นั่ง</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT SEAT / GUEST DETAILS ================= */}
      {editingSeat && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-600" />
                <h3 className="font-serif-thai font-bold text-lg text-slate-900">
                  แก้ไขข้อมูลที่นั่งและผู้เข้าร่วมงาน (เจ้าหน้าที่)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSeat(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSeatEdit} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ–นามสกุล ผู้ร่วมงาน <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="08x-xxx-xxxx"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    อีเมล
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ประเภทผู้ร่วมงาน
                </label>
                <select
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="graduate">บัณฑิต ป.โท คณะพยาบาลศาสตร์ มข. (โต๊ะ 3–9)</option>
                  <option value="faculty">คณาจารย์ / ผู้บริหาร (โต๊ะ 1–2)</option>
                  <option value="agn5">กลุ่ม AGN5 (โต๊ะ 10–12)</option>
                  <option value="guest">ครอบครัวและแขกผู้มีเกียรติ</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    หมายเลขโต๊ะ (1–12)
                  </label>
                  <select
                    value={editTable}
                    onChange={e => setEditTable(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    {TABLES.map(t => (
                      <option key={t.id} value={t.id}>
                        โต๊ะ {t.id} ({t.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    หมายเลขเก้าอี้ (1–8)
                  </label>
                  <select
                    value={editSeatNum}
                    onChange={e => setEditSeatNum(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => {
                      const isSameCurrent = s === editingSeat.seat && editTable === editingSeat.table;
                      const occupied =
                        !isSameCurrent &&
                        existingSeats.some(es => es.table === editTable && es.seat === s);
                      return (
                        <option key={s} value={s}>
                          เก้าอี้ที่ {s} {occupied ? '(มีผู้นั่ง - จะสลับกัน)' : isSameCurrent ? '(ที่ปัจจุบัน)' : '(ว่าง)'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสบัตรเข้างาน (Ticket Code)
                </label>
                <input
                  type="text"
                  value={editTicketCode}
                  onChange={e => setEditTicketCode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุ / อาหาร (Notes)
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="เช่น ไม่ทานเนื้อวัว, อิสลาม"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editCheckedIn}
                    onChange={e => setEditCheckedIn(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>บันทึกสถานะ Check-in หน้างานแล้ว</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingSeat(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>บันทึกการเปลี่ยนแปลง</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DIGITAL PASS PREVIEW ================= */}
      {selectedTicketSeat && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-2xl w-full my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="no-print flex justify-end pb-2">
              <button
                type="button"
                onClick={() => setSelectedTicketSeat(null)}
                className="p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <DigitalPassCard
              guestName={selectedTicketSeat.guestName}
              category={selectedTicketSeat.category}
              table={selectedTicketSeat.table}
              seat={selectedTicketSeat.seat}
              ticketCode={selectedTicketSeat.ticketCode || `GRAD69-T${String(selectedTicketSeat.table).padStart(2, '0')}S${String(selectedTicketSeat.seat).padStart(2, '0')}`}
              checkedIn={selectedTicketSeat.checkedIn}
              phone={selectedTicketSeat.phone}
              email={selectedTicketSeat.email}
              onOpenEmailModal={() => {
                setEmailModalSeat(selectedTicketSeat);
                setSelectedTicketSeat(null);
              }}
              showActions={true}
            />
          </div>
        </div>
      )}

      {/* ================= MODAL: FULLSCREEN REAL SLIP VIEWER & VERIFICATION ================= */}
      {previewSlipUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl max-w-3xl w-full border-2 border-amber-500/40 p-6 shadow-2xl relative my-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-amber-200 font-serif-thai">
                  {previewSlipUrl.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewSlipUrl(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Left: The Real Slip Viewer (PDF Frame or High-Res Image) */}
              <div className="flex flex-col items-center justify-center bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
                {previewSlipUrl.url.includes('.pdf') || previewSlipUrl.title.toLowerCase().endsWith('.pdf') ? (
                  <div className="w-full">
                    <iframe
                      src={previewSlipUrl.url}
                      title={previewSlipUrl.title}
                      className="w-full h-[56vh] rounded-xl border border-slate-700 bg-white shadow-2xl"
                    />
                    <div className="mt-3 flex items-center gap-2 justify-center">
                      <button
                        type="button"
                        onClick={() => downloadFileFromUrl(previewSlipUrl.url, previewSlipUrl.title || 'slip.pdf')}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs rounded-xl flex items-center gap-1.5 font-bold transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-950" />
                        <span>ดาวน์โหลดไฟล์ต้นฉบับ (PDF)</span>
                      </button>
                      <a
                        href={previewSlipUrl.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl flex items-center gap-1.5 font-semibold transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                        <span>เปิดดู PDF เต็มจอ</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    <div className="max-h-[56vh] w-full overflow-auto rounded-xl border border-slate-700 bg-slate-950 flex items-center justify-center p-2">
                      <img
                        src={previewSlipUrl.url}
                        alt="สลิปโอนเงินความละเอียดสูง"
                        style={{
                          transform: `scale(${imageZoomLevel})`,
                          transition: 'transform 0.2s ease',
                          transformOrigin: 'center center'
                        }}
                        className="max-h-[52vh] w-auto rounded-lg shadow-2xl object-contain"
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
                      <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => setImageZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                          className="p-1 text-slate-300 hover:text-white rounded"
                          title="ซูมออก"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-mono text-amber-300 px-1 font-bold">
                          {Math.round(imageZoomLevel * 100)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => setImageZoomLevel(prev => Math.min(3, prev + 0.25))}
                          className="p-1 text-slate-300 hover:text-white rounded"
                          title="ซูมเข้า"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageZoomLevel(1)}
                          className="p-1 text-slate-400 hover:text-white rounded"
                          title="รีเซ็ตขนาด"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => downloadFileFromUrl(previewSlipUrl.url, previewSlipUrl.title || 'slip.jpg')}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs rounded-xl flex items-center gap-1.5 font-bold transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-950" />
                        <span>ดาวน์โหลดสลิปต้นฉบับ</span>
                      </button>
                      <a
                        href={previewSlipUrl.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl flex items-center gap-1.5 font-semibold transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                        <span>เปิดภาพต้นฉบับเต็มจอ</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Verification Details & Action Buttons */}
              <div className="space-y-4 text-xs text-slate-300">
                <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-2.5">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                    ข้อมูลตรวจสอบการชำระเงิน
                  </span>
                  
                  {previewSlipUrl.reservation && (
                    <>
                      <div className="flex justify-between border-b border-slate-700 pb-1.5">
                        <span className="text-slate-400">รหัสจอง:</span>
                        <span className="font-mono font-bold text-amber-300">{previewSlipUrl.reservation.id}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700 pb-1.5">
                        <span className="text-slate-400">ผู้โอนเงิน:</span>
                        <span className="font-semibold text-white">{previewSlipUrl.reservation.mainBooker}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700 pb-1.5">
                        <span className="text-slate-400">เบอร์โทรศัพท์:</span>
                        <span className="text-white">{previewSlipUrl.reservation.phone}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700 pb-1.5">
                        <span className="text-slate-400">อีเมลรับบัตร:</span>
                        <span className="text-white">{previewSlipUrl.reservation.email || '-'}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700 pb-1.5">
                        <span className="text-slate-400">จำนวนที่นั่ง:</span>
                        <span className="font-bold text-white">{previewSlipUrl.reservation.guestCount} ท่าน</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700 pb-1.5">
                        <span className="text-slate-400">ยอดเงินโอน:</span>
                        <span className="font-bold text-amber-300 text-sm">
                          {(previewSlipUrl.reservation.guestCount * TICKET_PRICE).toLocaleString()} บาท
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700 pb-1.5">
                        <span className="text-slate-400">สถานะปัจจุบัน:</span>
                        <span className={`font-bold px-2 py-0.5 rounded ${
                          previewSlipUrl.reservation.status === 'verified'
                            ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                            : previewSlipUrl.reservation.status === 'pending'
                            ? 'bg-amber-900/60 text-amber-300 border border-amber-500/40'
                            : 'bg-rose-900/60 text-rose-300 border border-rose-500/40'
                        }`}>
                          {previewSlipUrl.reservation.status === 'verified'
                            ? '✓ อนุมัติแล้ว'
                            : previewSlipUrl.reservation.status === 'pending'
                            ? '⏳ รอเจ้าหน้าที่ตรวจ'
                            : '✕ ปฏิเสธ'}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-slate-400">ที่นั่งที่ระบุ:</span>
                        <span className="text-amber-200 font-medium">
                          {previewSlipUrl.reservation.guests?.map(g => g.table && g.seat ? `T${g.table}S${g.seat}` : null).filter(Boolean).join(', ') || 'ยังไม่ระบุ'}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Direct Action inside Modal */}
                {previewSlipUrl.reservation && previewSlipUrl.reservation.status === 'pending' && (
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleApproveReservation(previewSlipUrl.reservation!);
                        setPreviewSlipUrl(null);
                      }}
                      className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Check className="w-5 h-5" />
                      <span>อนุมัติสลิป & ออกบัตรดิจิทัลทันที</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const reason = window.prompt('ระบุเหตุผลที่ปฏิเสธสลิป:', 'ยอดเงินไม่ถูกต้องหรือไม่พบข้อมูลการโอน');
                        if (reason !== null) {
                          if (onUpdateReservation) {
                            onUpdateReservation({ ...previewSlipUrl.reservation!, status: 'rejected', rejectionReason: reason });
                          } else if (onUpdateReservationStatus) {
                            onUpdateReservationStatus(previewSlipUrl.reservation!.id, 'rejected');
                          }
                          setPreviewSlipUrl(null);
                        }
                      }}
                      className="w-full py-2 bg-slate-800 hover:bg-rose-950 text-rose-400 border border-rose-800/40 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <span>ปฏิเสธสลิปนี้</span>
                    </button>
                  </div>
                )}

                {previewSlipUrl.reservation && previewSlipUrl.reservation.status === 'verified' && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-center font-semibold">
                    ✓ สลิปนี้ได้รับการอนุมัติเรียบร้อยแล้ว บัตรดิจิทัลและอีเมลถูกจัดส่งแล้ว
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHANGE ADMIN PASSCODE ================= */}
      {showPasscodeChangeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-slate-900">
                  เปลี่ยนรหัสผ่านเจ้าหน้าที่ (Admin PIN)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasscodeChangeModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePasscode} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ป้อนรหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)
                </label>
                <input
                  type="text"
                  required
                  value={newPasscode}
                  onChange={e => setNewPasscode(e.target.value)}
                  placeholder="เช่น 2569 หรือ kku2569"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPasscodeChangeModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow"
                >
                  บันทึกรหัสผ่านใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EMAIL TICKET ================= */}
      {emailModalSeat && (
        <EmailTicketModal
          isOpen={!!emailModalSeat}
          onClose={() => setEmailModalSeat(null)}
          guestName={emailModalSeat.guestName}
          category={emailModalSeat.category}
          table={emailModalSeat.table}
          seat={emailModalSeat.seat}
          ticketCode={emailModalSeat.ticketCode || `GRAD69-T${String(emailModalSeat.table).padStart(2, '0')}S${String(emailModalSeat.seat).padStart(2, '0')}`}
          defaultEmail={emailModalSeat.email || ''}
          tableName={TABLES.find(t => t.id === emailModalSeat.table)?.name}
        />
      )}

      {/* ================= MODAL: ALL ATTACHED DOCUMENTS & SLIPS VIEWER ================= */}
      {previewDocumentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 rounded-3xl max-w-4xl w-full border-2 border-amber-500/40 p-5 sm:p-7 shadow-2xl relative my-auto space-y-4 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-amber-200 font-serif-thai">
                    เอกสารแนบการจอง: {previewDocumentModal.reservation.mainBooker}
                  </h3>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span className="font-mono text-amber-300 font-bold">{previewDocumentModal.reservation.id}</span>
                    <span>·</span>
                    <span>เอกสารทั้งหมด {previewDocumentModal.documents.length} ฉบับ</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDocumentModal(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
              {previewDocumentModal.documents.map((doc, idx) => {
                const isDocPdf = doc.mimeType === 'application/pdf' || doc.name.toLowerCase().endsWith('.pdf') || doc.url.includes('application/pdf');
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => void handleSwitchDocIndex(idx)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      previewDocumentModal.activeDocIndex === idx
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{doc.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950/80 text-amber-300 font-mono">
                      {isDocPdf ? 'PDF' : doc.type === 'voucher' ? 'VOUCHER' : 'SLIP'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Document Content & Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Left 2 Cols: The Document Display */}
              <div className="md:col-span-2 flex flex-col items-center justify-center bg-slate-950/80 p-4 rounded-2xl border border-slate-800 min-h-[350px]">
                {(() => {
                  const activeDoc = previewDocumentModal.documents[previewDocumentModal.activeDocIndex];
                  if (!activeDoc || (!activeDoc.url && !activeSignedUrl)) {
                    return (
                      <div className="text-center py-12 px-6 max-w-md space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                        </div>
                        <h4 className="font-bold text-amber-300 text-base">
                          กำลังเตรียมเอกสารแนบ...
                        </h4>
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 text-left space-y-1">
                          <div>• <strong>ผู้จอง:</strong> {previewDocumentModal.reservation.mainBooker}</div>
                          <div>• <strong>เบอร์โทร:</strong> {previewDocumentModal.reservation.phone}</div>
                          <div>• <strong>ชื่อเอกสาร:</strong> {activeDoc?.name || previewDocumentModal.reservation.slipFileName || 'เอกสารแนบ'}</div>
                        </div>
                      </div>
                    );
                  }

                  if (signedUrlLoading) {
                    return (
                      <div className="py-20 text-center text-slate-400 space-y-3">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400" />
                        <span className="text-xs font-semibold">กำลังเชื่อมต่อ Supabase Storage และสร้าง Signed URL...</span>
                      </div>
                    );
                  }

                  const displayUrl = activeSignedUrl || activeDoc.url;
                  const isPdf = activeDoc.mimeType === 'application/pdf' || displayUrl.includes('.pdf') || (activeDoc.name && activeDoc.name.toLowerCase().endsWith('.pdf'));

                  return (
                    <div className="w-full flex flex-col items-center">
                      {isPdf ? (
                        <div className="w-full flex flex-col items-center">
                          <div className="w-full h-[56vh] rounded-xl overflow-hidden border border-slate-700 bg-white shadow-2xl relative">
                            <iframe
                              src={displayUrl}
                              title={activeDoc.name}
                              className="w-full h-full border-0"
                            />
                          </div>
                          <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
                            <button
                              type="button"
                              onClick={() => downloadFileFromUrl(displayUrl, activeDoc.name || 'document.pdf')}
                              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs rounded-xl flex items-center gap-1.5 font-bold shadow transition-all cursor-pointer"
                            >
                              <Download className="w-4 h-4 text-slate-950" />
                              <span>ดาวน์โหลดไฟล์ต้นฉบับ (PDF)</span>
                            </button>
                            <a
                              href={displayUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl flex items-center gap-1.5 font-semibold transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-4 h-4 text-amber-400" />
                              <span>เปิดดู PDF เต็มจอ (แท็บใหม่)</span>
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full flex flex-col items-center">
                          <div className="max-h-[56vh] w-full overflow-auto rounded-xl border border-slate-700 bg-slate-950 flex items-center justify-center p-2">
                            <img
                              src={displayUrl}
                              alt={activeDoc.name}
                              style={{
                                transform: `scale(${imageZoomLevel})`,
                                transition: 'transform 0.2s ease',
                                transformOrigin: 'center center'
                              }}
                              className="max-h-[52vh] w-auto rounded-lg shadow-2xl object-contain"
                            />
                          </div>
                          <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
                            <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl p-1">
                              <button
                                type="button"
                                onClick={() => setImageZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                                className="p-1 text-slate-300 hover:text-white rounded"
                                title="ซูมออก"
                              >
                                <ZoomOut className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-[10px] font-mono text-amber-300 px-1 font-bold">
                                {Math.round(imageZoomLevel * 100)}%
                              </span>
                              <button
                                type="button"
                                onClick={() => setImageZoomLevel(prev => Math.min(3, prev + 0.25))}
                                className="p-1 text-slate-300 hover:text-white rounded"
                                title="ซูมเข้า"
                              >
                                <ZoomIn className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setImageZoomLevel(1)}
                                className="p-1 text-slate-400 hover:text-white rounded"
                                title="รีเซ็ตขนาด"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => downloadFileFromUrl(displayUrl, activeDoc.name || 'slip.jpg')}
                              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs rounded-xl flex items-center gap-1.5 font-bold shadow transition-all cursor-pointer"
                            >
                              <Download className="w-4 h-4 text-slate-950" />
                              <span>ดาวน์โหลดสลิปต้นฉบับ</span>
                            </button>
                            <a
                              href={displayUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl flex items-center gap-1.5 font-semibold transition-colors cursor-pointer"
                            >
                              <Maximize2 className="w-4 h-4 text-amber-400" />
                              <span>เปิดภาพต้นฉบับเต็มจอ</span>
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Right Col: Reservation Info & Actions */}
              <div className="space-y-4 text-xs text-slate-300">
                <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-2.5">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                    ข้อมูลผู้จอง & สถานะ
                  </span>
                  <div className="flex justify-between border-b border-slate-700 pb-1.5">
                    <span className="text-slate-400">รหัสจอง:</span>
                    <span className="font-mono font-bold text-amber-300">{previewDocumentModal.reservation.id}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700 pb-1.5">
                    <span className="text-slate-400">ผู้จอง:</span>
                    <span className="font-semibold text-white">{previewDocumentModal.reservation.mainBooker}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700 pb-1.5">
                    <span className="text-slate-400">โทร:</span>
                    <span className="text-white">{previewDocumentModal.reservation.phone}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700 pb-1.5">
                    <span className="text-slate-400">อีเมล:</span>
                    <span className="text-white">{previewDocumentModal.reservation.email || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700 pb-1.5">
                    <span className="text-slate-400">จำนวนที่นั่ง:</span>
                    <span className="font-bold text-white">{previewDocumentModal.reservation.guestCount} ท่าน</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700 pb-1.5">
                    <span className="text-slate-400">ยอดชำระ:</span>
                    <span className="font-bold text-amber-300 text-sm">
                      {(previewDocumentModal.reservation.guestCount * TICKET_PRICE).toLocaleString()} บาท
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700 pb-1.5">
                    <span className="text-slate-400">สถานะ:</span>
                    <span className={`font-bold px-2 py-0.5 rounded ${
                      previewDocumentModal.reservation.status === 'verified'
                        ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                        : previewDocumentModal.reservation.status === 'pending'
                        ? 'bg-amber-900/60 text-amber-300 border border-amber-500/40'
                        : 'bg-rose-900/60 text-rose-300 border border-rose-500/40'
                    }`}>
                      {previewDocumentModal.reservation.status === 'verified'
                        ? '✓ อนุมัติแล้ว'
                        : previewDocumentModal.reservation.status === 'pending'
                        ? '⏳ รอตรวจ'
                        : '✕ ปฏิเสธ'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-400">ที่นั่ง:</span>
                    <span className="text-amber-200 font-medium">
                      {previewDocumentModal.reservation.guests?.map(g => g.table && g.seat ? `T${g.table}S${g.seat}` : null).filter(Boolean).join(', ') || 'ยังไม่ระบุ'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {previewDocumentModal.reservation.status === 'pending' && (
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        handleApproveReservation(previewDocumentModal.reservation);
                        setPreviewDocumentModal(null);
                      }}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>อนุมัติ & ส่งบัตรดิจิทัล</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const reason = window.prompt('ระบุเหตุผลที่ปฏิเสธสลิป:', 'ยอดเงินไม่ถูกต้องหรือไม่พบข้อมูลการโอน');
                        if (reason !== null) {
                          if (onUpdateReservation) {
                            onUpdateReservation({ ...previewDocumentModal.reservation, status: 'rejected', rejectionReason: reason });
                          } else if (onUpdateReservationStatus) {
                            onUpdateReservationStatus(previewDocumentModal.reservation.id, 'rejected');
                          }
                          setPreviewDocumentModal(null);
                        }
                      }}
                      className="w-full py-2 bg-slate-800 hover:bg-rose-950 text-rose-400 border border-rose-800/40 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <span>ปฏิเสธเอกสารนี้</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DOUBLE CONFIRMATION SERVER DELETION ================= */}
      {deletingReservation && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-2 border-rose-300 relative space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="p-2 bg-rose-100 rounded-xl">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    ยืนยันการลบผู้ลงทะเบียน (Server Deletion)
                  </h3>
                  <span className="text-[11px] text-rose-600 font-semibold">
                    ดำเนินการลบผ่าน Supabase Edge Function จริง
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingReservation(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">ชื่อผู้จองหลัก:</span>
                <span className="font-bold text-slate-900 text-sm">{deletingReservation.mainBooker}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">เลขที่การจอง (Booking ID):</span>
                <span className="font-mono font-bold text-amber-700">{deletingReservation.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">เบอร์โทรศัพท์:</span>
                <span className="font-semibold text-slate-800">{deletingReservation.phone}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">จำนวนที่นั่งที่จะคืนสู่ระบบ:</span>
                <span className="font-bold text-rose-600 text-sm">{deletingReservation.guestCount} ที่นั่ง</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">ยอดเงินที่เกี่ยวข้อง:</span>
                <span className="font-bold text-slate-900">{(deletingReservation.guestCount * TICKET_PRICE).toLocaleString()} บาท</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">ที่นั่งที่ระบุ:</span>
                <span className="text-slate-800 font-medium">
                  {deletingReservation.guests?.map(g => g.table && g.seat ? `โต๊ะ ${g.table} ที่นั่ง ${g.seat}` : null).filter(Boolean).join(', ') || 'ตามที่ระบุในกลุ่ม'}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>การคุ้มครองข้อมูลและความปลอดภัย:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-700 pl-1">
                <li>ลบข้อมูลการจองและรายการที่นั่งที่สัมพันธ์กันโดยใช้ธุรกรรมแบบ Atomic</li>
                <li>คืนที่นั่งให้ว่าง และอัปเดตผังโต๊ะ จำนวนผู้จอง และยอดเงินทันที</li>
                <li>บันทึกประวัติลง Audit Log พร้อมข้อมูลเจ้าหน้าที่ผู้ดำเนินการและเวลา</li>
                <li>ไม่ลบหรือกระทบข้อมูลของผู้จองรายอื่นในระบบ</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  พิมพ์คำว่า <span className="text-rose-600 font-bold font-mono">ยืนยันลบ</span> เพื่อยืนยันการลบ:
                </label>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmText('ยืนยันลบ')}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                >
                  คลิกเติมคำยืนยันอัตโนมัติ
                </button>
              </div>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="พิมพ์ 'ยืนยันลบ' หรือ 'ลบ'"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => !isDeleting && setDeletingReservation(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={!['ยืนยันลบ', 'ลบ', 'ยืนยัน', 'delete'].includes(deleteConfirmText.trim().toLowerCase()) || isDeleting}
                onClick={handleExecuteDelete}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeleting ? 'กำลังลบจากเซิร์ฟเวอร์...' : 'ยืนยันการลบถาวร'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
