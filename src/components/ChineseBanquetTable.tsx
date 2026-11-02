import React from 'react';
import { ExistingSeat, TableConfig } from '../types';
import { Users, CheckCircle2, User, Sparkles } from 'lucide-react';
import { OfficialKKUNurseSealSVG } from './OfficialKKUNurseSealSVG';

interface ChineseBanquetTableProps {
  table: TableConfig;
  seats: ExistingSeat[];
  selectedSeatNumber?: number | null;
  mySeatNumbers?: number[]; // seats selected by current user in registration
  onSelectSeat?: (seatNumber: number) => void;
  interactive?: boolean;
}

export const ChineseBanquetTable: React.FC<ChineseBanquetTableProps> = ({
  table,
  seats,
  selectedSeatNumber,
  mySeatNumbers = [],
  onSelectSeat,
  interactive = false
}) => {
  // Map of seat 1-10 to seated guest
  const seatMap = new Map<number, ExistingSeat>();
  seats.forEach(s => {
    if (s.table === table.id) {
      seatMap.set(s.seat, s);
    }
  });

  const occupiedCount = seatMap.size;
  const isFull = occupiedCount >= 8;

  // 8 chair angle calculations (0 to 7, starting from top 12 o'clock, 45 deg per chair)
  const chairPositions = Array.from({ length: 8 }, (_, i) => {
    const seatNum = i + 1;
    // -90 deg is top (12 o'clock), 45 deg per chair (8 chairs total)
    const angleDeg = -90 + (i * 45);
    const angleRad = (angleDeg * Math.PI) / 180;
    
    // Percentage offset from center (50%, 50%)
    const radius = 39; 
    const x = 50 + radius * Math.cos(angleRad);
    const y = 50 + radius * Math.sin(angleRad);

    const guest = seatMap.get(seatNum);
    const isMySeat = mySeatNumbers.includes(seatNum);
    const isSelected = selectedSeatNumber === seatNum;
    const isAvailable = !guest;

    return {
      seatNum,
      angleDeg,
      x,
      y,
      guest,
      isMySeat,
      isSelected,
      isAvailable
    };
  });

  return (
    <div className="w-full bg-slate-950/90 rounded-3xl p-4 sm:p-8 border border-amber-500/40 shadow-2xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,170,77,0.12)_0%,transparent_70%)] pointer-events-none" />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-4 border-b border-slate-800 relative z-10 mb-6 text-center sm:text-left">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>โต๊ะจีน 8 ที่นั่ง (CHINESE BANQUET TABLE)</span>
          </div>
          <h3 className="font-serif-thai text-xl sm:text-2xl font-bold text-amber-100">
            {table.name} — โต๊ะที่ {table.id}
          </h3>
          <p className="text-xs text-slate-400">
            {table.zone} · โรงแรมราชาวดี ขอนแก่น (ห้องแกรนด์บอลรูม)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`px-4 py-1.5 rounded-xl border text-xs font-bold ${
            isFull
              ? 'bg-rose-950/80 border-rose-500/60 text-rose-300'
              : 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
          }`}>
            {isFull ? 'โต๊ะเต็มแล้ว (8/8)' : `ว่าง ${8 - occupiedCount} ที่นั่ง`}
          </div>
        </div>
      </div>

      {/* CIRCULAR BANQUET TABLE VISUAL (DESKTOP & TABLET: Large Circular Canvas) */}
      <div className="relative w-full max-w-[620px] aspect-square mx-auto my-2 hidden sm:block">
        {/* Outer Circular Boundary */}
        <div className="absolute inset-6 rounded-full border border-amber-500/20 bg-slate-900/40" />

        {/* The Round Banquet Table Cloth (โต๊ะกลมปูผ้า) */}
        <div className="absolute inset-20 sm:inset-24 rounded-full bg-gradient-to-br from-amber-950 via-slate-900 to-amber-950 border-4 border-amber-500/60 shadow-2xl flex flex-col items-center justify-center p-4 text-center z-10">
          {/* Glass Lazy Susan (จานหมุนกระจกใสลายทอง) */}
          <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-2 border-dashed border-amber-400/50 bg-slate-950/80 flex flex-col items-center justify-center p-2 relative group overflow-hidden shadow-xl">
            {/* Center Faculty Crest Badge */}
            <div className="w-10 h-10 rounded-full overflow-hidden border border-amber-400/50 shadow-sm mb-1 bg-white shrink-0">
              <OfficialKKUNurseSealSVG size="100%" />
            </div>
            <span className="font-serif-thai text-sm font-bold text-amber-200 leading-tight">
              โต๊ะ {table.id}
            </span>
            <span className="text-[10px] text-slate-300 truncate max-w-[100px]">
              {table.name}
            </span>
            <span className="text-[8px] text-emerald-400 font-bold mt-0.5">
              {occupiedCount}/8 ที่นั่ง
            </span>
          </div>
        </div>

        {/* 10 Chairs Arranged in Circle Around Table */}
        {chairPositions.map(pos => {
          const { seatNum, x, y, guest, isMySeat, isSelected, isAvailable } = pos;

          return (
            <div
              key={seatNum}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              className="absolute z-20"
            >
              <div
                onClick={() => {
                  if (interactive && onSelectSeat && (isAvailable || isMySeat)) {
                    onSelectSeat(seatNum);
                  }
                }}
                className={`w-28 sm:w-32 p-2 rounded-2xl border transition-all text-center select-none ${
                  isMySeat
                    ? 'bg-amber-400 text-slate-950 border-white shadow-lg ring-4 ring-amber-400/50 scale-105 cursor-pointer font-bold'
                    : isSelected
                    ? 'bg-amber-500 text-slate-950 border-white shadow-xl ring-4 ring-amber-300 scale-105 cursor-pointer'
                    : guest
                    ? 'bg-slate-900/95 border-amber-500/40 text-white shadow-md'
                    : interactive
                    ? 'bg-emerald-950/90 border-emerald-400/60 text-emerald-200 hover:bg-emerald-800/90 hover:scale-105 cursor-pointer shadow-lg hover:border-emerald-300'
                    : 'bg-emerald-950/50 border-emerald-600/30 text-emerald-300'
                }`}
              >
                {/* Chair Number Badge */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                      isMySeat || isSelected
                        ? 'bg-slate-950 text-amber-300'
                        : guest
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    }`}
                  >
                    {seatNum}
                  </span>

                  <span className="text-[9px] font-semibold opacity-80">
                    {isMySeat
                      ? 'ที่นั่งคุณ'
                      : guest
                      ? guest.category === 'faculty'
                        ? 'อาจารย์'
                        : 'บัณฑิต'
                      : 'เก้าอี้ว่าง'}
                  </span>
                </div>

                {/* GUEST NAME DISPLAY (โชว์ชื่อเลย) */}
                <div className="min-h-[30px] flex items-center justify-center">
                  {guest ? (
                    <div className="w-full">
                      <div
                        className="font-bold text-xs leading-tight line-clamp-2 text-amber-100"
                        title={guest.guestName}
                      >
                        {guest.guestName}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] font-semibold text-emerald-300 flex items-center justify-center gap-1">
                      {interactive ? 'กดเพื่อจอง' : 'ว่าง'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MOBILE ADAPTIVE VIEW (Grid with Clear Chair Layout & Bold Names) */}
      <div className="block sm:hidden space-y-3">
        {/* Table Center Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border border-amber-500/40 text-center">
          <div className="text-xs font-serif-thai font-bold text-amber-200">
            จานหมุนโต๊ะจีน {table.name} (โต๊ะ {table.id})
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            มีผู้จองแล้ว {occupiedCount} / 10 ที่นั่ง
          </div>
        </div>

        {/* 10 Seats Card Grid showing names directly */}
        <div className="grid grid-cols-2 gap-2">
          {chairPositions.map(pos => {
            const { seatNum, guest, isMySeat, isSelected, isAvailable } = pos;

            return (
              <div
                key={seatNum}
                onClick={() => {
                  if (interactive && onSelectSeat && (isAvailable || isMySeat)) {
                    onSelectSeat(seatNum);
                  }
                }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  isMySeat
                    ? 'bg-amber-400 text-slate-950 border-white ring-2 ring-amber-300 font-bold'
                    : isSelected
                    ? 'bg-amber-500 text-slate-950 border-white'
                    : guest
                    ? 'bg-slate-900/90 border-slate-700 text-white'
                    : interactive
                    ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200 active:scale-95'
                    : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-slate-950/80 text-amber-300 text-[10px] inline-flex items-center justify-center font-mono">
                      {seatNum}
                    </span>
                    <span>เก้าอี้ {seatNum}</span>
                  </span>

                  <span className="text-[10px]">
                    {isMySeat ? 'ที่นั่งคุณ' : guest ? 'จองแล้ว' : 'ว่าง'}
                  </span>
                </div>

                {guest ? (
                  <div className="text-xs font-bold text-amber-200 truncate" title={guest.guestName}>
                    {guest.guestName}
                  </div>
                ) : (
                  <div className="text-[11px] text-emerald-300 font-semibold">
                    {interactive ? 'กดเลือกที่นั่งนี้' : 'เก้าอี้ว่าง'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Seat Roster Legend & Summary List */}
      <div className="mt-8 pt-4 border-t border-slate-800 text-xs">
        <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400 mb-3">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500/30 border border-amber-400 inline-block" />
            <span>มีผู้จองแล้ว (แสดงชื่อ)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500/30 border border-emerald-400 inline-block" />
            <span>เก้าอี้ว่าง</span>
          </span>
          {interactive && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400 border border-white inline-block" />
              <span>ที่นั่งที่คุณเลือก</span>
            </span>
          )}
        </div>

        {/* 8 Seats Direct List with Full Names */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          {chairPositions.map(({ seatNum, guest }) => (
            <div
              key={seatNum}
              className={`p-2 rounded-xl border flex items-center gap-2 ${
                guest
                  ? 'bg-slate-900 border-amber-500/30 text-slate-200'
                  : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <span className="w-5 h-5 rounded-md bg-slate-800 text-amber-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                {seatNum}
              </span>
              <div className="truncate">
                {guest ? (
                  <span className="font-semibold text-amber-100">{guest.guestName}</span>
                ) : (
                  <span className="text-emerald-400 italic">เก้าอี้ว่าง</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
