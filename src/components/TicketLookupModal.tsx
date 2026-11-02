import React, { useState } from 'react';
import { Search, Ticket, Printer, QrCode, Sparkles, CheckCircle2, UserCheck, Mail, PhoneCall, ExternalLink, MapPin } from 'lucide-react';
import { ExistingSeat, ReservationRecord } from '../types';
import { TABLES } from '../data/initialData';
import { KKUNursingLogo } from './KKUNursingLogo';
import { EmailTicketModal } from './EmailTicketModal';

interface TicketLookupProps {
  existingSeats: ExistingSeat[];
  reservations: ReservationRecord[];
}

export const TicketLookup: React.FC<TicketLookupProps> = ({
  existingSeats,
  reservations
}) => {
  const [query, setQuery] = useState('');
  const [selectedSeat, setSelectedSeat] = useState<ExistingSeat | null>(null);
  const [emailModalSeat, setEmailModalSeat] = useState<ExistingSeat | null>(null);

  // Search through all seats
  const results = query.trim()
    ? existingSeats.filter(s => {
        const q = query.toLowerCase();
        return (
          s.guestName.toLowerCase().includes(q) ||
          (s.ticketCode && s.ticketCode.toLowerCase().includes(q)) ||
          String(s.table) === q
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
            ค้นหาบัตรเข้างานและหมายเลขโต๊ะ
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            พิมพ์ชื่อ–นามสกุล หรือ รหัสบัตร (เช่น GRAD69-xxxx) เพื่อตรวจสอบที่นั่งและพิมพ์บัตร
          </p>

          <div className="mt-6 relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="พิมพ์ชื่อบัณฑิต หรือ รหัสบัตร..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-[11px] text-slate-400">
            <span>ตัวอย่างค้นหา:</span>
            {['อาจารย์ณิชา', 'กีรณา', 'ปวีณา', 'สุเมธ'].map(name => (
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
          <div className="space-y-4 mb-8">
            <div className="text-xs font-semibold text-slate-600">
              ผลการค้นหา ({results.length} รายการ)
            </div>

            {results.map((seat, idx) => (
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

            {results.length === 0 && (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs sm:text-sm">
                ไม่พบบัตรที่ตรงกับคำค้นหา โปรดตรวจสอบการสะกดชื่ออีกครั้ง
              </div>
            )}
          </div>
        )}

        {/* Selected Ticket Preview Card */}
        {selectedSeat && (
          <div className="border-t border-slate-200 pt-8 mt-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                DIGITAL GALA PASS PREVIEW
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEmailModalSeat(selectedSeat)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>ส่งบัตรทางอีเมล & ตั้งเตือน 1 วัน</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>พิมพ์บัตรใบนี้</span>
                </button>
              </div>
            </div>

            <article className="ticket-card bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl border border-amber-500/40 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <KKUNursingLogo size="sm" />
                    <span className="font-serif-thai text-amber-200 text-xs font-bold tracking-wider">
                      ยินดีมหาบัณฑิตพยาบาล มข. ๒๕๖๙ · FACULTY OF NURSING KKU
                    </span>
                  </div>

                  <h3 className="font-serif-thai text-2xl sm:text-3xl font-bold text-white">
                    {selectedSeat.guestName}
                  </h3>

                  <div className="text-xs text-slate-300">
                    {selectedSeat.category === 'faculty' ? 'คณาจารย์ / ผู้บริหาร' : 'มหาบัณฑิตพยาบาลศาสตร์ (ป.โท)'}
                  </div>

                  <div className="inline-flex items-center gap-4 p-3 bg-slate-900/90 rounded-2xl border border-amber-500/30">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">โต๊ะ</span>
                      <span className="font-serif-thai text-xl font-bold text-amber-300">
                        โต๊ะ {selectedSeat.table}
                      </span>
                    </div>
                    <div className="h-6 w-px bg-slate-700" />
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">เก้าอี้</span>
                      <span className="font-serif-thai text-xl font-bold text-amber-300">
                        ที่ {selectedSeat.seat}
                      </span>
                    </div>
                    <div className="h-6 w-px bg-slate-700" />
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">สถานะ</span>
                      <span className="text-xs text-emerald-400 font-semibold">
                        {selectedSeat.checkedIn ? 'Check-in แล้ว' : 'ยืนยันที่นั่ง'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-300 space-y-1 pt-1">
                    <p className="text-amber-200/90 font-medium">
                      21 ธันวาคม 2569 · 16.30–20.00 น. · ห้องแกรนด์บอลรูม โรงแรมราชาวดี ขอนแก่น
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <a
                        href="https://www.google.com/maps/place/Rachawadee+Khonkaen+Airport+Hotel/@16.460217,102.7838134,17z/data=!3m1!4b1!4m9!3m8!1s0x312261cbd71eca59:0xc4e42f5f77ff1dbe!5m2!4m1!1i2!8m2!3d16.460217!4d102.7863883!16s%2Fg%2F1tkb2l2h?entry=ttu&g_ep=EgoyMDI2MTAyOC4wIKXMDSoASAFQAw%3D%3D"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-amber-300 hover:text-white underline text-[11px]"
                      >
                        <MapPin className="w-3 h-3 text-amber-400" />
                        <span>แผนที่ Google Maps โรงแรมราชาวดี</span>
                      </a>
                      <a
                        href="tel:0951864940"
                        className="inline-flex items-center gap-1 text-slate-300 hover:text-amber-300 text-[11px]"
                      >
                        <PhoneCall className="w-3 h-3 text-amber-400" />
                        <span>สอบถามเพิ่มเติม: 0951864940</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-4 bg-slate-900 rounded-2xl border border-slate-800 text-center shrink-0">
                  <div className="w-28 h-28 bg-white p-2 rounded-xl mb-2 flex items-center justify-center">
                    <div className="w-full h-full bg-[repeating-conic-gradient(#000000_0_25%,#ffffff_0_50%)] [background-size:10px_10px]" />
                  </div>
                  <div className="font-mono text-xs text-amber-300 font-bold">
                    {selectedSeat.ticketCode || `GRAD69-${selectedSeat.table}${selectedSeat.seat}`}
                  </div>
                  <span className="text-[10px] text-slate-400">สแกน ณ ทางเข้างาน</span>
                </div>
              </div>
            </article>
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
