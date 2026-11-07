import React, { useState } from 'react';
import { Search, Ticket, Printer, QrCode, Sparkles, CheckCircle2, UserCheck, Mail, PhoneCall, ExternalLink, MapPin } from 'lucide-react';
import { ExistingSeat, ReservationRecord } from '../types';
import { TABLES } from '../data/initialData';
import { KKUNursingLogo } from './KKUNursingLogo';
import { EmailTicketModal } from './EmailTicketModal';
import { DigitalPassCard } from './DigitalPassCard';

interface TicketLookupProps {
  existingSeats: ExistingSeat[];
  reservations: ReservationRecord[];
  onSelectReservationForSeating?: (reservationId: string) => void;
}

export const TicketLookup: React.FC<TicketLookupProps> = ({
  existingSeats,
  reservations,
  onSelectReservationForSeating
}) => {
  const [query, setQuery] = useState('');
  const [selectedSeat, setSelectedSeat] = useState<ExistingSeat | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<ReservationRecord | null>(null);
  const [emailModalSeat, setEmailModalSeat] = useState<ExistingSeat | null>(null);

  // Search through all seats
  const seatResults = query.trim()
    ? existingSeats.filter(s => {
        const q = query.toLowerCase();
        return (
          s.guestName.toLowerCase().includes(q) ||
          (s.ticketCode && s.ticketCode.toLowerCase().includes(q)) ||
          String(s.table) === q
        );
      })
    : [];

  // Search through all reservations (including pending ones)
  const reservationResults = query.trim()
    ? reservations.filter(r => {
        const q = query.toLowerCase();
        return (
          r.mainBooker.toLowerCase().includes(q) ||
          r.phone.includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.guests.some(g => g.name.toLowerCase().includes(q))
        );
      })
    : [];

  return (
    <div className="max-w-4xl mx-auto mb-16">
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-amber-500/30 shadow-xl shadow-slate-900/5">
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-3">
            <Ticket className="w-7 h-7" />
          </div>
          <h2 className="font-serif-thai text-2xl sm:text-3xl font-bold text-slate-900">
            ค้นหาบัตรเข้างานและตรวจสอบสถานะการจอง
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            พิมพ์ชื่อ–นามสกุล เบอร์โทรศัพท์ หรือ รหัสการจอง (เช่น RES-xxxxxx) เพื่อตรวจสอบสถานะสลิปและพิมพ์บัตร
          </p>

          <div className="mt-6 relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="พิมพ์ชื่อบัณฑิต, เบอร์โทร, หรือรหัสจอง..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-[11px] text-slate-400">
            <span>ตัวอย่างค้นหา:</span>
            {['กีรณา', '089', 'RES-'].map(name => (
              <button
                key={name}
                type="button"
                onClick={() => setQuery(name)}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Search Results */}
        {query.trim() && (
          <div className="space-y-6 mb-8">
            {/* 1. Reservation Level Results (Status of Slip & Seating Unlock) */}
            {reservationResults.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  <span>ข้อมูลคำขอลงทะเบียน & สถานะตรวจสอบสลิป ({reservationResults.length} รายการ)</span>
                </div>

                {reservationResults.map(res => {
                  const hasSeats = res.assignments && Object.keys(res.assignments).length > 0;
                  return (
                    <div
                      key={res.id}
                      className={`p-5 rounded-2xl border-2 transition-all ${
                        res.status === 'verified'
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : res.status === 'pending'
                          ? 'border-amber-300 bg-amber-50/50'
                          : 'border-rose-200 bg-rose-50/50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-amber-300">
                              {res.id}
                            </span>
                            <h3 className="font-bold text-slate-900 text-base">{res.mainBooker}</h3>
                            <span className="text-xs text-slate-500 font-medium">({res.phone})</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            จำนวน {res.guestCount} ท่าน · ยอดชำระ {(res.guestCount * 799).toLocaleString('th-TH')} บาท
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          {res.status === 'verified' ? (
                            <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>อนุมัติสลิปแล้ว</span>
                            </span>
                          ) : res.status === 'pending' ? (
                            <span className="px-3 py-1 bg-amber-500 text-slate-950 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                              <span>⏳ รอเจ้าหน้าที่ตรวจสอบสลิป</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-rose-600 text-white rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                              <span>✕ สลิปไม่ผ่านการอนุมัติ</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Explanation & Action */}
                      <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="text-slate-600">
                          {res.status === 'pending' && (
                            <span className="text-amber-800 font-medium">
                              ⚠️ ยังไม่สามารถเลือกที่นั่งได้: อยู่ระหว่างเจ้าหน้าที่ตรวจสอบยอดเงินโอน 799 บาท/ท่าน สอบถามเพิ่มเติมโทร: <a href="tel:0951864940" className="underline font-bold">0951864940</a>
                            </span>
                          )}
                          {res.status === 'verified' && !hasSeats && (
                            <span className="text-emerald-800 font-medium">
                              ✓ เจ้าหน้าที่อนุมัติสลิปเรียบร้อยแล้ว: สิทธิ์เลือกที่นั่งเปิดใช้งานแล้ว สามารถเข้าเลือกโต๊ะได้ทันที!
                            </span>
                          )}
                          {res.status === 'verified' && hasSeats && (
                            <span className="text-emerald-800 font-medium">
                              ✓ สำรองที่นั่งเรียบร้อยแล้ว (สามารถคลิกดูบัตร Digital Gala Pass ด้านล่างได้)
                            </span>
                          )}
                          {res.status === 'rejected' && (
                            <span className="text-rose-700 font-medium">
                              {res.rejectionReason || 'สลิปโอนเงินไม่ถูกต้อง กรุณาติดต่อเจ้าหน้าที่เพื่อส่งสลิปใหม่'}
                            </span>
                          )}
                        </div>

                        {res.status === 'verified' && !hasSeats && onSelectReservationForSeating && (
                          <button
                            type="button"
                            onClick={() => onSelectReservationForSeating(res.id)}
                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>เลือกโต๊ะและที่นั่งของคุณตอนนี้</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. Seat Level Results (Seated Tickets) */}
            {seatResults.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-amber-600" />
                  <span>บัตรที่นั่งที่จัดสรรแล้ว ({seatResults.length} ที่นั่ง)</span>
                </div>

                {seatResults.map((seat, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedSeat(seat)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      selectedSeat?.ticketCode === seat.ticketCode
                        ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400'
                        : 'border-slate-200 hover:border-amber-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-300 flex items-center justify-center font-bold text-sm">
                        T{seat.table}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{seat.guestName}</h3>
                        <div className="text-xs text-slate-500">
                          โต๊ะ {seat.table} ({TABLES.find(t => t.id === seat.table)?.name}) · เก้าอี้ที่ {seat.seat}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs px-2.5 py-1 bg-slate-200 rounded-lg text-slate-700">
                        {seat.ticketCode || `GRAD69-${seat.table}${seat.seat}`}
                      </span>
                      <button
                        type="button"
                        className="px-3 py-1.5 bg-slate-900 text-amber-300 hover:bg-slate-800 rounded-xl text-xs font-medium transition-colors"
                      >
                        ดูบัตรเข้างาน
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {seatResults.length === 0 && reservationResults.length === 0 && (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs sm:text-sm">
                ไม่พบบัตรหรือรายการจองที่ตรงกับคำค้นหา โปรดตรวจสอบการสะกดชื่อหรือเบอร์โทรศัพท์อีกครั้ง
              </div>
            )}
          </div>
        )}

        {/* Selected Ticket Preview Card */}
        {selectedSeat && (
          <div className="border-t border-slate-200 pt-8 mt-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                ตัวอย่างบัตรเกียรติยศเข้างาน (DIGITAL GALA PASS PREVIEW)
              </span>
            </div>

            <DigitalPassCard
              guestName={selectedSeat.guestName}
              category={selectedSeat.category}
              table={selectedSeat.table}
              seat={selectedSeat.seat}
              ticketCode={selectedSeat.ticketCode || `GRAD69-T${String(selectedSeat.table).padStart(2, '0')}S${String(selectedSeat.seat).padStart(2, '0')}`}
              checkedIn={selectedSeat.checkedIn}
              onOpenEmailModal={() => setEmailModalSeat(selectedSeat)}
              showActions={true}
            />
          </div>
        )}
      </div>

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
              ? 'มหาบัณฑิตพยาบาลศาสตร์'
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
