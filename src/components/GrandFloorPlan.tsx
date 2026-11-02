import React, { useState } from 'react';
import {
  LayoutGrid,
  Search,
  Users,
  CheckCircle2,
  X,
  Sparkles,
  Info,
  CircleDot
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
  const [zoneFilter, setZoneFilter] = useState<'all' | 'โซนคณะอาจารย์' | 'โซนบัณฑิต' | 'โซนผู้ร่วมงานและครอบครัว' | string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'full'>('all');
  
  // Spotlight active table for Chinese Banquet 8-person round view
  const [activeBanquetTableId, setActiveBanquetTableId] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'banquet' | 'ballroom'>('banquet');

  const totalSeats = 120;
  const totalOccupied = existingSeats.length;

  const activeBanquetTable = TABLES.find(t => t.id === activeBanquetTableId) || TABLES[0];

  // Filtered tables for ballroom view
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

  return (
    <div className="max-w-6xl mx-auto mb-16 space-y-8">
      {/* Title & Overview Ribbon */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-amber-500/30 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>CHINESE BANQUET SEATING PLAN</span>
            </div>
            <h2 className="font-serif-thai text-2xl sm:text-3xl font-bold text-amber-100">
              ผังที่นั่งโต๊ะจีน 8 คน โรงแรมราชาวดี ขอนแก่น
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              แผนผังโต๊ะจีนกลม 8 ที่นั่ง แสดงชื่อ-นามสกุลผู้ร่วมงานตรงตามตำแหน่งเก้าอี้เสมือนจริง
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
          <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('banquet')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                viewMode === 'banquet'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <CircleDot className="w-4 h-4" />
              <span>มุมมองโต๊ะจีนกลม 8 คน (โชว์ชื่อเลย)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('ballroom')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                viewMode === 'ballroom'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>ภาพรวมห้องจัดเลี้ยงทั้ง 15 โต๊ะ</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onSelectTableForBooking(activeBanquetTableId)}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>ไปสำรองที่นั่งโต๊ะ {activeBanquetTableId} นี้</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: CHINESE BANQUET 8-PERSON TABLE WITH NAMES */}
      {viewMode === 'banquet' && (
        <div className="space-y-6">
          {/* Table Selector Pills (1 to 15) */}
          <div className="bg-white rounded-3xl p-5 border border-amber-500/20 shadow-md">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CircleDot className="w-4 h-4 text-amber-600" />
                <span>คลิกเลือกหมายเลขโต๊ะจีนที่ต้องการดู (1–15):</span>
              </span>
              <span className="text-xs text-slate-500">
                โต๊ะละ 8 คน
              </span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-15 gap-1.5">
              {TABLES.map(t => {
                const occ = existingSeats.filter(s => s.table === t.id).length;
                const isSelected = t.id === activeBanquetTableId;
                const isFull = occ >= 8;

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveBanquetTableId(t.id)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center border ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md ring-2 ring-amber-300 scale-105'
                        : isFull
                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                    }`}
                  >
                    <div>โต๊ะ {t.id}</div>
                    <div className="text-[10px] opacity-80 font-normal">
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

      {/* VIEW MODE 2: BALLROOM OVERVIEW (15 Tables with mini Chinese tables and names) */}
      {viewMode === 'ballroom' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-500/20 shadow-xl space-y-6">
          {/* Stage Presentation */}
          <div className="text-center">
            <div className="relative inline-block w-full max-w-2xl px-6 py-4 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-amber-200 border-2 border-amber-500/40 shadow-xl">
              <div className="font-serif-thai text-base sm:text-lg font-bold tracking-widest uppercase">
                ✦ เวทีพิธีการหลัก & จอฉายเกียรติยศ ✦
              </div>
              <div className="text-[11px] text-amber-300/80 mt-0.5">
                STAGE & CEREMONIAL HONORS PODIUM
              </div>
            </div>
            <div className="text-xs text-slate-400 mt-2">
              แถวที่ 1 ใกล้เวทีที่สุด · แถวที่ 3 โซนด้านหลังห้องแกรนด์บอลรูม (โรงแรมราชาวดี ขอนแก่น)
            </div>
          </div>

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
                <option value="all">ทุกโซนในห้องแกรนด์บอลรูม</option>
                <option value="โซนคณะอาจารย์">โซนคณะอาจารย์ (โต๊ะ 1–2)</option>
                <option value="โซนบัณฑิต">โซนบัณฑิต (โต๊ะ 3–7)</option>
                <option value="โซนผู้ร่วมงานและครอบครัว">โซนผู้ร่วมงานและครอบครัว (โต๊ะ 8–15)</option>
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

          {/* 15 Banquet Tables in Ballroom Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            {filteredTables.map(t => {
              const seatsInTable = existingSeats.filter(s => s.table === t.id);
              const occ = seatsInTable.length;
              const isFull = occ >= t.capacity;

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
                    {t.zone} · 8 ที่นั่ง
                  </div>

                  {/* Circular Chinese Banquet Mini Visual (Showing 8 seats directly) */}
                  <div className="p-3 bg-slate-900 rounded-2xl text-white mb-3">
                    <div className="text-[10px] text-amber-300 font-bold mb-2 flex justify-between">
                      <span>ผังโต๊ะจีน 8 คน</span>
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
          <div className="bg-slate-950 rounded-3xl max-w-4xl w-full border border-amber-500/40 shadow-2xl relative my-8">
            <button
              onClick={() => setSelectedTableModal(null)}
              className="absolute top-4 right-4 z-30 p-2.5 rounded-full text-slate-400 hover:text-white bg-slate-900 border border-slate-700"
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
                  className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-900"
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
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5"
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
