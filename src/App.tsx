/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { RegistrationFlow } from './components/RegistrationFlow';
import { GrandFloorPlan } from './components/GrandFloorPlan';
import { TicketLookup } from './components/TicketLookupModal';
import { AdminConsole } from './components/AdminConsole';
import { AdminLogin } from './components/AdminLogin';
import { CheckInScanner } from './components/CheckInScanner';
import { ExistingSeat, ReservationRecord } from './types';
import {
  INITIAL_PRESET_SEATS,
  getStoredReservations,
  saveReservationToStorage,
  getStoredExtraSeats,
  saveExtraSeatToStorage,
  updateReservationStatusInStorage
} from './data/initialData';
import { PhoneCall } from 'lucide-react';
import {
  fetchPublicSeats,
  createReservation,
  fetchAdminReservations,
  deleteReservationFromServer,
  updateReservationOnServer,
  reassignSeatOnServer,
  swapSeatsOnServer,
  deleteSeatOnServer,
  request
} from './bookingApi';
import { supabase } from './supabase';
import { KKUNursingLogo } from './components/KKUNursingLogo';

export default function App() {
  const [activeTab, setActiveTab] = useState<'register' | 'floorplan' | 'search' | 'checkin' | 'admin'>('register');
  const [existingSeats, setExistingSeats] = useState<ExistingSeat[]>([]);
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaffTestMode, setIsStaffTestMode] = useState(false);

  const loadAdminReservations = async () => {
    try {
      const data = await fetchAdminReservations();
      setReservations(data);
    } catch (error) {
      window.alert('ไม่สามารถโหลดข้อมูลผู้จองได้ กรุณาลองใหม่');
    }
  };
  // All visitors share the same server-authoritative seat map.
  const [seatsReady, setSeatsReady] = useState(false);
  const [seatsError, setSeatsError] = useState('');
  const refreshSeats = async () => {
    try {
      const seats = await fetchPublicSeats();
      setExistingSeats(seats);
      setSeatsError('');
      setSeatsReady(true);
    } catch (error) {
      setSeatsError(error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อมูลที่นั่งได้');
      setSeatsReady(false);
    }
  };

  useEffect(() => {
    void refreshSeats();
    const timer = window.setInterval(() => void refreshSeats(), 15000);
    const onFocus = () => void refreshSeats();
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, []);

  const handleSaveReservation = async (record: ReservationRecord) => {
    await createReservation(record);
    setReservations(prev => [record, ...prev]);
    await refreshSeats();
  };

  // Restore staff session on reload if active
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        request<{ isAdmin: boolean }>('admin-api', { action: 'verify-admin' }, data.session.access_token)
          .then((verifyData) => {
            if (verifyData?.isAdmin) {
              setIsAdmin(true);
              void loadAdminReservations();
            }
          })
          .catch(() => {});
      }
    });
  }, []);

  // Administrative changes require a separately authenticated server endpoint.
  const handleToggleCheckIn = async (table: number, seat: number) => {
    if (!isAdmin) {
      window.alert('กรุณาเข้าสู่ระบบเจ้าหน้าที่ก่อน');
      return;
    }

    const currentSeat = existingSeats.find(
      (s) => s.table === table && s.seat === seat
    );

    if (!currentSeat) {
      window.alert('ไม่พบข้อมูลที่นั่งนี้');
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const data = await request<{ success: boolean; seat: { checked_in: boolean } }>(
        'admin-api',
        {
          action: 'set-checkin',
          table,
          seat,
          checkedIn: !currentSeat.checkedIn,
        },
        token
      );

      if (!data?.success) {
        throw new Error('ไม่สามารถบันทึกการเช็กอินได้');
      }

      setExistingSeats((prev) =>
        prev.map((s) =>
          s.table === table && s.seat === seat
            ? { ...s, checkedIn: data.seat.checked_in }
            : s
        )
      );

      window.alert('บันทึกสถานะ Check-in สำเร็จ');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเช็กอิน กรุณาลองใหม่');
    }
  };

  const handleUpdateReservationStatus = async (id: string, status: 'verified' | 'pending' | 'rejected', reason?: string) => {
    // 1. Update reservation in state
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status, rejectionReason: reason } : r));
    updateReservationStatusInStorage(id, status);

    // 2. If status is 'rejected', immediately free all associated seats so table/seats become VACANT!
    if (status === 'rejected') {
      const targetRes = reservations.find(r => r.id === id);
      if (targetRes) {
        const seatsToFree = new Set<string>();
        if (targetRes.assignments) {
          Object.values(targetRes.assignments).forEach((a: any) => {
            if (a?.table && a?.seat) seatsToFree.add(`${a.table}-${a.seat}`);
          });
        }
        if (targetRes.guests) {
          targetRes.guests.forEach(g => {
            if (g.table && g.seat) seatsToFree.add(`${g.table}-${g.seat}`);
          });
        }
        if (seatsToFree.size > 0) {
          setExistingSeats(prev => prev.filter(s => !seatsToFree.has(`${s.table}-${s.seat}`)));
        }
      }
    }

    // 3. Persist to Supabase
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      await request('admin-api', {
        action: 'update-status',
        reservationId: id,
        status,
        rejectionReason: reason || null
      }, token);
      await refreshSeats();
    } catch (err: any) {
      console.warn('Database status update notice:', err.message);
    }
  };

  const handleUpdateReservation = async (record: ReservationRecord) => {
    // 1. Find previous seats for this reservation
    const oldRes = reservations.find(r => r.id === record.id);
    const oldSeats = new Set<string>();
    if (oldRes?.assignments) {
      Object.values(oldRes.assignments).forEach((a: any) => {
        if (a?.table && a?.seat) oldSeats.add(`${a.table}-${a.seat}`);
      });
    }
    if (oldRes?.guests) {
      oldRes.guests.forEach(g => {
        if (g.table && g.seat) oldSeats.add(`${g.table}-${g.seat}`);
      });
    }

    // 2. Update state immediately (ชื่อและข้อมูลอัปเดตทันที)
    setReservations(prev => prev.map(r => r.id === record.id ? record : r));
    updateReservationStatusInStorage(record.id, record.status);

    // 3. Update seats immediately: if rejected, release old seats; otherwise, replace old seats with new seats!
    if (record.status === 'rejected') {
      setExistingSeats(prev => prev.filter(s => !oldSeats.has(`${s.table}-${s.seat}`)));
    } else {
      const newSeatsList: ExistingSeat[] = [];
      if (record.assignments) {
        Object.entries(record.assignments).forEach(([idxStr, pos]: [string, any]) => {
          if (pos?.table && pos?.seat) {
            const guestIdx = parseInt(idxStr, 10);
            const guest = record.guests?.[guestIdx] || record.guests?.[0];
            newSeatsList.push({
              table: pos.table,
              seat: pos.seat,
              guestName: guest?.name || record.mainBooker || 'ผู้ร่วมงาน',
              category: guest?.category || record.category || 'guest',
              ticketCode: guest?.ticketCode,
              checkedIn: false
            });
          }
        });
      }

      setExistingSeats(prev => [
        // Remove previous seats of this reservation so old seats become VACANT immediately ("ว่างเมื่อเปลี่ยน")
        ...prev.filter(s => !oldSeats.has(`${s.table}-${s.seat}`)),
        // Add newly assigned seats
        ...newSeatsList
      ]);
    }

    // 4. Persist full record to Supabase
    try {
      await updateReservationOnServer(record);
      await refreshSeats();
    } catch (err: any) {
      console.warn('Server reservation update notice:', err.message);
    }
  };

  const handleUpdateSeat = (table: number, seat: number, updated: Partial<ExistingSeat>) => {
    setExistingSeats(prev =>
      prev.map(s => (s.table === table && s.seat === seat ? { ...s, ...updated } : s))
    );
  };

  const handleReassignSeat = async (
    oldTable: number,
    oldSeat: number,
    newTable: number,
    newSeat: number,
    data: Partial<ExistingSeat>
  ) => {
    // Previous seat becomes VACANT immediately in local state
    setExistingSeats(prev => [
      ...prev.filter(s => !(s.table === oldTable && s.seat === oldSeat)),
      {
        table: newTable,
        seat: newSeat,
        guestName: data.guestName || 'ผู้ร่วมงาน',
        category: data.category || 'guest',
        checkedIn: false
      }
    ]);
    try {
      await reassignSeatOnServer(oldTable, oldSeat, newTable, newSeat);
      await refreshSeats();
    } catch (err: any) {
      console.warn('Reassign seat notice:', err.message);
    }
  };

  const handleSwapSeats = async (tableA: number, seatA: number, tableB: number, seatB: number) => {
    setExistingSeats(prev => {
      const seatAData = prev.find(s => s.table === tableA && s.seat === seatA);
      const seatBData = prev.find(s => s.table === tableB && s.seat === seatB);
      if (!seatAData && !seatBData) return prev;
      return prev.map(s => {
        if (s.table === tableA && s.seat === seatA) {
          return seatBData ? { ...seatBData, table: tableA, seat: seatA } : s;
        }
        if (s.table === tableB && s.seat === seatB) {
          return seatAData ? { ...seatAData, table: tableB, seat: seatB } : s;
        }
        return s;
      });
    });

    try {
      await swapSeatsOnServer(tableA, seatA, tableB, seatB);
      await refreshSeats();
    } catch (err: any) {
      console.warn('Swap seats notice:', err.message);
    }
  };

  const handleDeleteSeat = async (table: number, seat: number) => {
    // Immediately vacant on screen
    setExistingSeats(prev => prev.filter(s => !(s.table === table && s.seat === seat)));
    try {
      await deleteSeatOnServer(table, seat);
      await refreshSeats();
    } catch (err: any) {
      console.warn('Delete seat notice:', err.message);
    }
  };

  const handleDeleteReservation = async (reservationId: string) => {
    // 1. Immediately find and free assigned seats in local state (โต๊ะว่างจริงทันที)
    const targetRes = reservations.find(r => r.id === reservationId);
    if (targetRes) {
      const seatsToFree = new Set<string>();
      if (targetRes.assignments) {
        Object.values(targetRes.assignments).forEach((a: any) => {
          if (a?.table && a?.seat) seatsToFree.add(`${a.table}-${a.seat}`);
        });
      }
      if (targetRes.guests) {
        targetRes.guests.forEach(g => {
          if (g.table && g.seat) seatsToFree.add(`${g.table}-${g.seat}`);
        });
      }
      if (seatsToFree.size > 0) {
        setExistingSeats(prev => prev.filter(s => !seatsToFree.has(`${s.table}-${s.seat}`)));
      }
    }

    // 2. Remove from local reservations list immediately (ชื่อหายไปจริงทันที)
    setReservations(prev => prev.filter(r => r.id !== reservationId));

    // 3. Delete from Supabase server
    try {
      const result = await deleteReservationFromServer(reservationId);
      window.alert(result.message || 'ลบข้อมูลการจองและคืนที่นั่งเรียบร้อยแล้ว');
      await refreshSeats();
    } catch (error) {
      await refreshSeats();
      window.alert(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการลบข้อมูลการจองจากเซิร์ฟเวอร์');
    }
  };

  const handleAddManualSeat = (newSeat: ExistingSeat) => {
    setExistingSeats(prev => [...prev.filter(s => !(s.table === newSeat.table && s.seat === newSeat.seat)), newSeat]);
    saveExtraSeatToStorage(newSeat);
  };

  const handleResetData = () => {
    window.alert('ไม่อนุญาตให้ลบข้อมูลการจองผ่านหน้าเว็บไซต์สาธารณะ');
  };

  const totalSeats = 120;
  const totalOccupied = existingSeats.length;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-50/50 via-slate-50 to-slate-100 flex flex-col selection:bg-amber-200">
      {/* 3-Zone Top Bar Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onStartRegistration={() => {
          setIsStaffTestMode(false);
          setActiveTab('register');
          window.scrollTo({ top: 350, behavior: 'smooth' });
        }}
        totalOccupied={totalOccupied}
        totalSeats={totalSeats}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Ceremonial Hero Banner (Visible on 'register' or 'floorplan') */}
        {activeTab === 'register' && (
          <HeroSection
            onStartBooking={() => {
              const el = document.getElementById('registration-flow-anchor');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            onViewFloorPlan={() => setActiveTab('floorplan')}
            totalOccupied={totalOccupied}
            totalSeats={totalSeats}
          />
        )}

        <div id="registration-flow-anchor" />

        {/* Tab 1: Registration and Seat Assignment Flow */}
        {seatsError && <div role="alert" className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">{seatsError} — ปิดการยืนยันการจองชั่วคราวเพื่อป้องกันจองซ้ำ <button className="underline" onClick={() => void refreshSeats()}>ลองใหม่</button></div>}
        {activeTab === 'register' && (
          <RegistrationFlow
            existingSeats={existingSeats}
            seatsReady={seatsReady}
            onSaveReservation={handleSaveReservation}
            onViewAdmin={() => {
              setIsStaffTestMode(false);
              setActiveTab('admin');
            }}
            onViewFloorPlan={() => setActiveTab('floorplan')}
            isTestMode={isStaffTestMode}
            onExitTestMode={() => {
              setIsStaffTestMode(false);
              setActiveTab('admin');
            }}
          />
        )}

        {/* Tab 2: Grand Floor Plan 15 Tables */}
        {activeTab === 'floorplan' && (
          <GrandFloorPlan
            existingSeats={existingSeats}
            onSelectTableForBooking={tableId => {
              setActiveTab('register');
            }}
          />
        )}

        {/* Tab 3: Ticket & Seat Lookup */}
        {activeTab === 'search' && (
          <TicketLookup
            existingSeats={existingSeats}
            reservations={reservations}
          />
        )}

        {/* Tab 4: QR Code Check-in & Live Seating Desk */}
        {activeTab === 'checkin' && (
          isAdmin ? (
            <CheckInScanner
              existingSeats={existingSeats}
              onToggleCheckIn={handleToggleCheckIn}
              onNavigateToFloorPlan={() => setActiveTab('floorplan')}
            />
          ) : (
            <div className="max-w-md mx-auto space-y-4">
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-center text-amber-900 text-xs sm:text-sm font-semibold">
                🔒 จุดลงทะเบียนและสแกนเข้างานต้องเข้าสู่ระบบเจ้าหน้าที่ก่อนเพื่อยืนยันสิทธิ์ผ่าน Supabase Auth
              </div>
              <AdminLogin onSuccess={() => { setIsAdmin(true); void loadAdminReservations(); }} />
            </div>
          )
        )}

        {/* Tab 5: Admin Management Console */}
        {activeTab === 'admin' && (
          isAdmin ? (
            <AdminConsole
              existingSeats={existingSeats}
              reservations={reservations}
              onToggleCheckIn={handleToggleCheckIn}
              onResetData={handleResetData}
              onUpdateReservationStatus={handleUpdateReservationStatus}
              onUpdateReservation={handleUpdateReservation}
              onUpdateSeat={handleUpdateSeat}
              onReassignSeat={handleReassignSeat}
              onSwapSeats={handleSwapSeats}
              onDeleteSeat={handleDeleteSeat}
              onAddManualSeat={handleAddManualSeat}
              onDeleteReservation={handleDeleteReservation}
              onStartTestRegistration={() => {
                setIsStaffTestMode(true);
                setActiveTab('register');
              }}
            />
          ) : (
           <AdminLogin onSuccess={() => { setIsAdmin(true); void loadAdminReservations(); }} />
          )
        )}

      </main>

      {/* Clean University Footer */}
      <footer className="no-print border-t border-slate-200 bg-white text-slate-600 text-xs py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center md:text-left">
            <KKUNursingLogo size="sm" />
            <div>
              <span className="font-serif-thai font-semibold text-slate-800 block">
                โครงการจัดงานฉลองยินดีบัณฑิต คณะพยาบาลศาสตร์ มหาวิทยาลัยขอนแก่น
              </span>
              <span className="text-[11px] text-slate-500">
                21 ธันวาคม 2569 · โรงแรมราชาวดี ขอนแก่น (ห้องแกรนด์บอลรูม) · เวลา 18.00 - 22.00 น. (ลงทะเบียน 17.30 น.)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
              <span>สอบถามเพิ่มเติม: <a href="tel:0951864940" className="hover:text-amber-600 font-bold transition-colors">0951864940</a></span>
            </span>
            <span aria-hidden="true">·</span>
            <span>โต๊ะกลมจัดเลี้ยง 12 โต๊ะ (โต๊ะละ 8 ที่นั่ง)</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-700 font-medium">ระบบสำรองที่นั่งระบุชื่อและบัตรดิจิทัล</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
