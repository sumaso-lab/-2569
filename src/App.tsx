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
import { CheckInScanner } from './components/CheckInScanner';
import { ExistingSeat, ReservationRecord } from './types';
import {
  INITIAL_PRESET_SEATS,
  getStoredReservations,
  saveReservationToStorage,
  getStoredExtraSeats,
  saveExtraSeatToStorage
} from './data/initialData';
import { Award, Heart, HelpCircle, PhoneCall, ShieldCheck } from 'lucide-react';
import { fetchPublicSeats, createReservation } from './bookingApi';
import { KKUNursingLogo } from './components/KKUNursingLogo';

export default function App() {
  const [activeTab, setActiveTab] = useState<'register' | 'floorplan' | 'search' | 'checkin' | 'admin'>('register');
  const [existingSeats, setExistingSeats] = useState<ExistingSeat[]>([]);
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);

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

  // Administrative changes require a separately authenticated server endpoint.
  const handleToggleCheckIn = (_table: number, _seat: number) => {
    window.alert('การเช็กอินต้องใช้สิทธิ์ผู้ดูแล ระบบสาธารณะไม่อนุญาตให้เปลี่ยนสถานะ');
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
            onViewAdmin={() => setActiveTab('admin')}
            onViewFloorPlan={() => setActiveTab('floorplan')}
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
          <CheckInScanner
            existingSeats={existingSeats}
            onToggleCheckIn={handleToggleCheckIn}
            onNavigateToFloorPlan={() => setActiveTab('floorplan')}
          />
        )}

        {/* Tab 5: Admin Management Console */}
        
{activeTab === 'admin' && (
  isAdmin ? (
    <AdminConsole
      existingSeats={existingSeats}
      reservations={reservations}
      onToggleCheckIn={handleToggleCheckIn}
      onResetData={handleResetData}
    />
  ) : (
    <AdminLogin onSuccess={() => setIsAdmin(true)} />
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
                21 ธันวาคม 2569 · โรงแรมราชาวดี ขอนแก่น (ห้องแกรนด์บอลรูม) · ประตูกลางเปิด 16.00 น.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
              <span>สอบถามเพิ่มเติม: <a href="tel:0951864940" className="hover:text-amber-600 font-bold transition-colors">0951864940</a></span>
            </span>
            <span aria-hidden="true">·</span>
            <span>โต๊ะกลมจัดเลี้ยง 15 โต๊ะ (โต๊ะละ 8 ที่นั่ง)</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-700 font-medium">ระบบสำรองที่นั่งระบุชื่อและบัตรดิจิทัล</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
