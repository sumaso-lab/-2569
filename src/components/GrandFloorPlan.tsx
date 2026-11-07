import React, { useState } from 'react';
import {
  LayoutGrid,
  Search,
  Users,
  CheckCircle2,
  X,
  Sparkles,
  Info,
  CircleDot,
  Image as ImageIcon,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Award
} from 'lucide-react';
import { ExistingSeat, TableConfig } from '../types';
import { TABLES } from '../data/initialData';
import { ChineseBanquetTable } from './ChineseBanquetTable';

interface GrandFloorPlanProps {
  existingSeats: ExistingSeat[];
  onSelectTableForBooking: (tableId: number) => void;
}

export const GrandFloorPlan: React.FC<GrandFloorPlanProps> = ({
  existingSeats,
  onSelectTableForBooking
}) => {
  const [selectedTableModal, setSelectedTableModal] = useState<TableConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState<'all' | 'โซนอาจารย์' | 'โซนบัณฑิต' | 'โซน AGN5' | string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'full'>('all');

  // View modes: 'diagram' (matching image) | 'banquet' (individual round table) | 'list' (card grid)
  const [viewMode, setViewMode] = useState<'diagram' | 'banquet' | 'list'>('diagram');

  // Spotlight active table for Chinese Banquet 8-person round view
  const [activeBanquetTableId, setActiveBanquetTableId] = useState<number>(1);

  const totalSeats = 96; // 12 tables x 8 seats
  const totalOccupied = existingSeats.length;

  const activeBanquetTable = TABLES.find(t => t.id === activeBanquetTableId) || TABLES[0];

  // Helper to determine table theme matching the user's diagram
  const getTableTheme = (tableId: number) => {
    if (tableId === 1 || tableId === 2) {
      return {
        type: 'faculty',
        label: 'อาจารย์',
        tagBg: 'bg-amber-100 text-amber-900 border-amber-300',
        tableBg: 'bg-amber-100 border-amber-600 text-amber-950',
        chairBg: 'bg-amber-300 border-amber-600',
        chairFilledBg: 'bg-amber-500 border-amber-700',
        accent: 'border-amber-500 shadow-amber-900/20'
      };
    }
    if (tableId >= 3 && tableId <= 9) {
      return {
        type: 'graduate',
        label: 'บัณฑิต',
        tagBg: 'bg-blue-100 text-blue-900 border-blue-300',
        tableBg: 'bg-blue-100 border-blue-500 text-blue-950',
        chairBg: 'bg-blue-200 border-blue-600',
        chairFilledBg: 'bg-blue-500 border-blue-700',
        accent: 'border-blue-400 shadow-blue-900/20'
      };
    }
    return {
      type: 'agn5',
      label: 'AGN5',
      tagBg: 'bg-sky-100 text-sky-900 border-sky-300',
      tableBg: 'bg-sky-100 border-sky-600 text-sky-950',
      chairBg: 'bg-sky-200 border-sky-600',
      chairFilledBg: 'bg-sky-500 border-sky-700',
      accent: 'border-sky-500 shadow-sky-900/20'
    };
  };

  // Filtered tables for list view
  const filteredTables = TABLES.filter(t => {
    if (zoneFilter !== 'all' && t.zone !== zoneFilter) return false;

    const occ = existingSeats.filter(s => s.table === t.id).length;
    if (statusFilter === 'available' && occ >= t.capacity) return false;
    if (statusFilter === 'full' && occ < t.capacity) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTable = t.name.toLowerCase().includes(q) || `โต๊ะ ${t.id}`.toLowerCase().includes(q);
      const matchGuest = existingSeats.some(
        s => s.table === t.id && s.guestName.toLowerCase().includes(q)
      );
      if (!matchTable && !matchGuest) return false;
    }

    return true;
  });

  // Render a circular table with 8 surrounding chairs directly styled like the uploaded photo
  const renderDiagramTable = (tableId: number, options?: { showBookingButton?: boolean }) => {
    const tableConfig = TABLES.find(t => t.id === tableId) || {
      id: tableId,
      name: `โต๊ะ ${tableId}`,
      zone: tableId <= 2 ? 'โซนอาจารย์' : tableId <= 9 ? 'โซนบัณฑิต' : 'โซน AGN5',
      capacity: 8,
      description: ''
    };
    const seatsInTable = existingSeats.filter(s => s.table === tableId);
    const occ = seatsInTable.length;
    const isFull = occ >= 8;
    const theme = getTableTheme(tableId);

    // 8 chair angles around the circle
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];

    return (
      <div
        key={tableId}
        onClick={() => setSelectedTableModal(tableConfig)}
        className="flex flex-col items-center justify-center p-2 group cursor-pointer transition-all hover:scale-105"
      >
        {/* Circular Banquet Table Container */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
          {/* 8 Chairs positioned around circle */}
          {angles.map((angle, idx) => {
            const rad = (angle * Math.PI) / 180;
            // Radius from center to chair center
            const radius = 48; // in pixels
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;
            const seatNum = idx + 1;
            const isTaken = seatsInTable.some(s => s.seat === seatNum);

            return (
              <div
                key={idx}
                style={{
                  transform: `translate(${x}px, ${y}px) rotate(${angle}deg)`
                }}
                className={`absolute w-4 h-6 sm:w-5 sm:h-7 rounded-sm border transition-all ${
                  isTaken
                    ? `${theme.chairFilledBg} text-white`
                    : `${theme.chairBg}`
                } shadow-xs flex items-center justify-center`}
                title={`เก้าอี้ที่ ${seatNum} ${isTaken ? '(มีผู้จองแล้ว)' : '(ว่าง)'}`}
              />
            );
          })}

          {/* Central Round Table Circle */}
          <div
            className={`relative z-10 w-20 h-20 sm:w-22 sm:h-22 rounded-full border-3 flex flex-col items-center justify-center shadow-md transition-all group-hover:shadow-lg ${theme.tableBg}`}
          >
            <span className="font-serif-thai text-xl sm:text-2xl font-black leading-none drop-shadow-xs">
              {tableId}
            </span>
            <span className="text-[11px] sm:text-xs font-bold mt-0.5 tracking-tight">
              {theme.label}
            </span>
            <span className="text-[9px] font-semibold opacity-90 mt-0.5">
              {occ > 0 ? (isFull ? 'เต็ม 8 ที่' : `จอง ${occ}/8`) : 'ว่าง 8 ที่'}
            </span>
          </div>
        </div>

        {/* Caption beneath table */}
        <div className="mt-1 text-center">
          <span className="text-[11px] font-bold text-slate-700 block">
            โต๊ะ {tableId}
          </span>
          <span
            className={`text-[9px] px-2 py-0.5 rounded-full font-bold inline-block border ${
              isFull
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : occ > 0
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}
          >
            {isFull ? 'เต็ม' : `ว่าง ${8 - occ} ที่`}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto mb-16 space-y-6">
      {/* Title & Overview Ribbon */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-amber-500/30 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>CHINESE BANQUET SEATING PLAN (12 TABLES)</span>
            </div>
            <h2 className="font-serif-thai text-2xl sm:text-3xl font-bold text-amber-100">
              ผังที่นั่งห้องจัดเลี้ยง 12 โต๊ะ (96 ที่นั่ง)
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              โต๊ะ 1–2 อาจารย์ · โต๊ะ 3–9 บัณฑิต · โต๊ะ 10–12 AGN5 (โต๊ะจีนกลมละ 8 ที่นั่ง โรงแรมราชาวดี ขอนแก่น)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 bg-slate-800/90 rounded-2xl border border-slate-700 text-right">
              <span className="block text-[11px] text-slate-400">อัตราการสำรอง</span>
              <span className="text-base font-bold text-amber-300">
                {totalOccupied} / {totalSeats} ที่ ({Math.round((totalOccupied / totalSeats) * 100)}%)
              </span>
            </div>
            <div className="px-4 py-2.5 bg-emerald-950/60 rounded-2xl border border-emerald-700/60 text-right">
              <span className="block text-[11px] text-emerald-400">ที่นั่งว่างคงเหลือ</span>
              <span className="text-base font-bold text-emerald-300">
                {totalSeats - totalOccupied} ที่นั่ง
              </span>
            </div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('diagram')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'diagram'
                  ? 'bg-amber-400 text-slate-950 shadow font-extrabold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>🗺️ ผังเสมือนจริง 12 โต๊ะ (ตามรูปต้นฉบับ)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('banquet')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'banquet'
                  ? 'bg-amber-400 text-slate-950 shadow font-extrabold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <CircleDot className="w-4 h-4" />
              <span>🔍 ดูโต๊ะจีนกลม 8 คน (โชว์รายชื่อ)</span>
            </button>


            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-amber-400 text-slate-950 shadow font-extrabold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>📋 ตารางสรุป 12 โต๊ะ</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onSelectTableForBooking(activeBanquetTableId)}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>ไปสำรองที่นั่งโต๊ะ {activeBanquetTableId}</span>
          </button>
        </div>
      </div>

      {/* ================= VIEW MODE 1: INTERACTIVE DIAGRAM EXACTLY AS ATTACHED IMAGE ================= */}
      {viewMode === 'diagram' && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border-2 border-slate-200 shadow-xl space-y-6">
          {/* Header Legend */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
            <div>
              <h3 className="font-serif-thai text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>แผนผังห้องจัดเลี้ยง (ตรงตามแบบจำลองห้อง)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                คลิกที่โต๊ะใดก็ได้เพื่อเปิดดูชื่อผู้ร่วมงานทั้ง 8 เก้าอี้ หรือไปที่หน้าจอง
              </p>
            </div>

            {/* 3 Zone Color Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-200 border-2 border-amber-600" />
                <span className="font-bold text-amber-950">1-2 อาจารย์</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-blue-200 border-2 border-blue-500" />
                <span className="font-bold text-blue-950">3-9 บัณฑิต</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-sky-200 border-2 border-sky-600" />
                <span className="font-bold text-sky-950">10-12 AGN5</span>
              </span>
            </div>
          </div>

          {/* THE FLOOR PLAN DIAGRAM CANVAS */}
          <div className="relative max-w-4xl mx-auto p-4 sm:p-8 bg-slate-50/60 rounded-3xl border-2 border-slate-300/80 shadow-inner overflow-hidden">
            {/* 1. TOP STAGE: เวที (สมมติ) */}
            <div className="flex justify-center mb-6">
              <div className="w-full max-w-xl py-3 px-6 rounded-2xl bg-slate-900 text-amber-300 border-2 border-amber-500/60 text-center shadow-md">
                <div className="font-serif-thai text-lg sm:text-xl font-bold tracking-widest uppercase">
                  เวที (สมมติ)
                </div>
                <div className="text-[10px] text-slate-300">
                  STAGE & COMMENCEMENT PODIUM
                </div>
              </div>
            </div>

            {/* MAIN 2-COLUMN TABLE GRID WITH CENTRAL AISLE */}
            <div className="relative flex justify-between items-stretch gap-4 sm:gap-8 my-4">
              {/* VERTICAL CENTRAL AISLE (ทางเดินกลาง) */}
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-16 sm:w-20 bg-slate-200/70 border-x-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center pointer-events-none z-0">
                <span
                  style={{ writingMode: 'vertical-rl' }}
                  className="text-xs sm:text-sm font-bold tracking-widest text-slate-600 uppercase select-none transform rotate-180"
                >
                  ทางเดินกลาง
                </span>
              </div>

              {/* LEFT WING OF TABLES */}
              <div className="flex-1 space-y-6 sm:space-y-8 z-10 pr-2">
                {/* Row 1 Left: Table 1 (อาจารย์) */}
                <div className="flex justify-center">
                  {renderDiagramTable(1)}
                </div>

                {/* Row 2 Left: Table 3 and Table 4 (บัณฑิต) */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4 justify-items-center">
                  {renderDiagramTable(3)}
                  {renderDiagramTable(4)}
                </div>

                {/* Row 3 Left: Table 7 and Table 8 (บัณฑิต) */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4 justify-items-center">
                  {renderDiagramTable(7)}
                  {renderDiagramTable(8)}
                </div>

                {/* Row 4 Left: Table 11 (AGN5) */}
                <div className="flex justify-center">
                  {renderDiagramTable(11)}
                </div>
              </div>

              {/* RIGHT WING OF TABLES */}
              <div className="flex-1 space-y-6 sm:space-y-8 z-10 pl-2">
                {/* Row 1 Right: Table 2 (อาจารย์) */}
                <div className="flex justify-center">
                  {renderDiagramTable(2)}
                </div>

                {/* Row 2 Right: Table 5 and Table 6 (บัณฑิต) */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4 justify-items-center">
                  {renderDiagramTable(5)}
                  {renderDiagramTable(6)}
                </div>

                {/* Row 3 Right: Table 9 (บัณฑิต) and Table 10 (AGN5) */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4 justify-items-center">
                  {renderDiagramTable(9)}
                  {renderDiagramTable(10)}
                </div>

                {/* Row 4 Right: Table 12 (AGN5) */}
                <div className="flex justify-center">
                  {renderDiagramTable(12)}
                </div>
              </div>
            </div>

            {/* 3. BOTTOM ENTRANCE: ทางเข้า (สมมติ) */}
            <div className="flex justify-center mt-6">
              <div className="w-full max-w-sm py-2.5 px-6 rounded-2xl bg-white border-2 border-slate-900 text-slate-900 text-center shadow-md relative">
                {/* Gate visual markers */}
                <div className="absolute -top-3 left-4 w-4 h-3 bg-slate-900 rounded-t-sm" />
                <div className="absolute -top-3 right-4 w-4 h-3 bg-slate-900 rounded-t-sm" />
                <div className="font-serif-thai text-base sm:text-lg font-bold tracking-wider">
                  ทางเข้า (สมมติ)
                </div>
                <div className="text-[10px] text-slate-500">
                  GRAND BALLROOM ENTRANCE
                </div>
              </div>
            </div>
          </div>

          {/* Quick Notice about Table Categories */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>การจัดสรรโซนโต๊ะ:</strong> โต๊ะ 1–2 (อาจารย์) · โต๊ะ 3–9 (บัณฑิต ป.โท) · โต๊ะ 10–12 (AGN5) — รวมทั้งสิ้น 12 โต๊ะ 96 ที่นั่ง
            </span>
          </div>
        </div>
      )}

      {/* ================= VIEW MODE 2: SPOTLIGHT INDIVIDUAL CHINESE BANQUET TABLE ================= */}
      {viewMode === 'banquet' && (
        <div className="space-y-6">
          {/* Table Selector Pills (1 to 12) */}
          <div className="bg-white rounded-3xl p-5 border border-amber-500/20 shadow-md">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CircleDot className="w-4 h-4 text-amber-600" />
                <span>คลิกเลือกหมายเลขโต๊ะจีนที่ต้องการดู (1–12):</span>
              </span>
              <span className="text-xs text-slate-500">
                โต๊ะละ 8 คน
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1.5">
              {TABLES.map(t => {
                const occ = existingSeats.filter(s => s.table === t.id).length;
                const isSelected = t.id === activeBanquetTableId;
                const isFull = occ >= 8;
                const theme = getTableTheme(t.id);

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveBanquetTableId(t.id)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md ring-2 ring-amber-300 scale-105'
                        : isFull
                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                    }`}
                  >
                    <div>โต๊ะ {t.id}</div>
                    <div className="text-[10px] font-semibold opacity-90">
                      {theme.label}
                    </div>
                    <div className="text-[10px] opacity-75 font-normal">
                      {occ}/8
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* The Large Visual Chinese Banquet Table */}
          <ChineseBanquetTable
            table={activeBanquetTable}
            seats={existingSeats}
            interactive={false}
          />
        </div>
      )}


      {/* ================= VIEW MODE 4: LIST OF 12 TABLES ================= */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-500/20 shadow-xl space-y-6">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
            <div className="sm:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อผู้ร่วมงาน หรือ โต๊ะ..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={zoneFilter}
                onChange={e => setZoneFilter(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-700 outline-none"
              >
                <option value="all">ทุกโซนในห้องจัดเลี้ยง (12 โต๊ะ)</option>
                <option value="โซนอาจารย์">โซนอาจารย์ (โต๊ะ 1–2)</option>
                <option value="โซนบัณฑิต">โซนบัณฑิต (โต๊ะ 3–9)</option>
                <option value="โซน AGN5">โซน AGN5 (โต๊ะ 10–12)</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-700 outline-none"
              >
                <option value="all">สถานะที่นั่งทั้งหมด</option>
                <option value="available">เฉพาะโต๊ะที่มีที่ว่าง</option>
                <option value="full">เฉพาะโต๊ะที่เต็มแล้ว</option>
              </select>
            </div>
          </div>

          {/* 12 Banquet Tables in Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            {filteredTables.map(t => {
              const seatsInTable = existingSeats.filter(s => s.table === t.id);
              const occ = seatsInTable.length;
              const isFull = occ >= t.capacity;
              const theme = getTableTheme(t.id);

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTableModal(t)}
                  className={`p-5 rounded-3xl border-2 transition-all cursor-pointer group hover:-translate-y-1 hover:shadow-xl ${
                    isFull
                      ? 'border-rose-200 bg-rose-50/30'
                      : occ > 0
                      ? 'border-amber-300/80 bg-gradient-to-b from-white to-amber-50/20'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {/* Table Header */}
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-base text-slate-900 group-hover:text-amber-700 transition-colors flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-amber-300 text-xs inline-flex items-center justify-center">
                        {t.id}
                      </span>
                      <span>{t.name}</span>
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        isFull
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isFull ? 'เต็ม 8 ที่' : `ว่าง ${8 - occ} ที่`}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 mb-3 truncate">
                    {t.zone} · 8 ที่นั่ง ({theme.label})
                  </div>

                  {/* Circular Chinese Banquet Mini Visual */}
                  <div className="p-3 bg-slate-900 rounded-2xl text-white mb-3">
                    <div className="text-[10px] text-amber-300 font-bold mb-2 flex justify-between">
                      <span>ผังโต๊ะจีน 8 คน ({theme.label})</span>
                      <span>คลิกเพื่อดูโต๊ะใหญ่</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      {Array.from({ length: 8 }, (_, i) => i + 1).map(sNum => {
                        const sInfo = seatsInTable.find(s => s.seat === sNum);
                        return (
                          <div
                            key={sNum}
                            className={`px-2 py-1 rounded flex items-center gap-1.5 truncate ${
                              sInfo
                                ? 'bg-slate-800 text-amber-100 border border-slate-700'
                                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                            }`}
                          >
                            <span className="font-bold text-[10px] text-amber-400 shrink-0">
                              {sNum}.
                            </span>
                            <span className="truncate">
                              {sInfo ? sInfo.guestName : 'ว่าง'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveBanquetTableId(t.id);
                        setViewMode('banquet');
                      }}
                      className="text-xs text-amber-700 font-bold hover:underline"
                    >
                      ดูผังโต๊ะจีนกลมเต็มจอ →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTables.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              ไม่พบโต๊ะตามเงื่อนไขการค้นหา
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL FOR A CLICKED TABLE (Shows Full Chinese Banquet Table) */}
      {selectedTableModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-950 rounded-3xl max-w-4xl w-full border border-amber-500/40 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedTableModal(null)}
              className="absolute top-4 right-4 z-30 p-2.5 rounded-full text-slate-400 hover:text-white bg-slate-900 border border-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-4 sm:p-6">
              <ChineseBanquetTable
                table={selectedTableModal}
                seats={existingSeats}
                interactive={false}
              />

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedTableModal(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-900 cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const tableId = selectedTableModal.id;
                    setSelectedTableModal(null);
                    onSelectTableForBooking(tableId);
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>ไปสำรองที่นั่งโต๊ะ {selectedTableModal.id} นี้</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
