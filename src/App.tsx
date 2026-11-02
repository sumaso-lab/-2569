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
import { KKUNursingLogo } from './components/KKUNursingLogo';

export default function App() {
  const [activeTab, setActiveTab] = useState<'register' | 'floorplan' | 'search' | 'checkin' | 'admin'>('register');
  const [existingSeats, setExistingSeats] = useState<ExistingSeat[]>([]);
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);

  // Load initial seats and reservations from storage or default
  useEffect(() => {
    const storedRes = getStoredReservations();
    setReservations(storedRes);

    const storedExtra = getStoredExtraSeats();
    // Combine initial preset with stored extra seats
    const seatMap = new Map<string, ExistingSeat>();

    INITIAL_PRESET_SEATS.forEach(s => {
      seatMap.set(`${s.table}-${s.seat}`, s);
    });

    storedExtra.forEach(s => {
      seatMap.set(`${s.table}-${s.seat}`, s);
    });

    // Also inject any seats from stored reservations if not present
    storedRes.forEach(r => {
      r.guests.forEach((g, idx) => {
        const assign = r.assignments[idx];
        if (assign) {
          seatMap.set(`${assign.table}-${assign.seat}`, {
            table: assign.table,
            seat: assign.seat,
            guestName: g.name,
            category: g.category,
            ticketCode: g.ticketCode || `GRAD69-${assign.table}${assign.seat}`,
            checkedIn: false
          });
        }
      });
    });

    setExistingSeats(Array.from(seatMap.values()));
  }, []);

  // Save new reservation
  const handleSaveReservation = (record: ReservationRecord) => {
    saveReservationToStorage(record);
    setReservations(prev => [record, ...prev]);

    // Update existingSeats with new guests
    const newSeats: ExistingSeat[] = [];
    record.guests.forEach((g, idx) => {
      const assign = record.assignments[idx];
      if (assign) {
        const newSeat: ExistingSeat = {
          table: assign.table,
          seat: assign.seat,
          guestName: g.name,
          category: g.category,
          ticketCode: g.ticketCode || `GRAD69-${assign.table}${assign.seat}`,
          checkedIn: false
        };
        newSeats.push(newSeat);
        saveExtraSeatToStorage(newSeat);
      }
    });

    setExistingSeats(prev => {
      const map = new Map<string, ExistingSeat>();
      prev.forEach(s => map.set(`${s.table}-${s.seat}`, s));
      newSeats.forEach(s => map.set(`${s.table}-${s.seat}`, s));
      return Array.from(map.values());
    });
  };

  // Toggle check-in status in admin console
  const handleToggleCheckIn = (table: number, seat: number) => {
    setExistingSeats(prev => {
      const updated = prev.map(s => {
        if (s.table === table && s.seat === seat) {
          const toggled = !s.checkedIn;
          saveExtraSeatToStorage({ ...s, checkedIn: toggled });
          return { ...s, checkedIn: toggled };
        }
        return s;
      });
      return updated;
    });
  };

  // Clear all bookings completely (100% available seats)
  const handleResetData = () => {
    if (window.confirm('คุณต้องการเคลียร์คนจองออกทั้งหมดและเปิดที่นั่งว่าง 100% (120 ที่) ใช่หรือไม่?')) {
      localStorage.removeItem('grad69_reservations_v1');
      localStorage.removeItem('grad69_extra_seats_v1');
      setReservations([]);
      setExistingSeats([]);
    }
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
        {activeTab === 'register' && (
          <RegistrationFlow
            existingSeats={existingSeats}
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
          <AdminConsole
            existingSeats={existingSeats}
            reservations={reservations}
            onToggleCheckIn={handleToggleCheckIn}
            onResetData={handleResetData}
          />
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
