import React from 'react';
import { Search, LayoutGrid, UserCheck, Sparkles, QrCode } from 'lucide-react';
import { KKUNursingLogo } from './KKUNursingLogo';

interface NavbarProps {
  activeTab: 'register' | 'floorplan' | 'search' | 'checkin' | 'admin';
  setActiveTab: (tab: 'register' | 'floorplan' | 'search' | 'checkin' | 'admin') => void;
  onStartRegistration: () => void;
  totalOccupied: number;
  totalSeats: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onStartRegistration,
  totalOccupied,
  totalSeats
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-amber-500/25 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <button
          onClick={() => setActiveTab('register')}
          className="flex items-center gap-3 text-left focus:outline-none group text-amber-200 hover:text-amber-100 transition-colors"
        >
          <KKUNursingLogo size="md" />
          <div>
            <span className="font-serif-thai text-xl font-bold tracking-wide text-amber-200 block leading-tight">
              ยินดีบัณฑิตพยาบาล มข. ๒๕๖๙
            </span>
            <span className="text-[10px] tracking-wider text-slate-400 hidden sm:block">
              FACULTY OF NURSING · KHON KAEN UNIVERSITY
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <button
            onClick={() => setActiveTab('register')}
            className={`transition-colors py-1 ${
              activeTab === 'register'
                ? 'text-amber-300 font-semibold border-b-2 border-amber-400'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            ลงทะเบียนจองที่นั่ง
          </button>

          <button
            onClick={() => setActiveTab('floorplan')}
            className={`transition-colors py-1 flex items-center gap-1.5 ${
              activeTab === 'floorplan'
                ? 'text-amber-300 font-semibold border-b-2 border-amber-400'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-amber-400/80" />
            <span>ผังโรงแรมราชาวดี ขอนแก่น (12 โต๊ะ)</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`transition-colors py-1 flex items-center gap-1.5 ${
              activeTab === 'search'
                ? 'text-amber-300 font-semibold border-b-2 border-amber-400'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Search className="w-4 h-4 text-amber-400/80" />
            <span>ค้นหาบัตร / ที่นั่ง</span>
          </button>

          <button
            onClick={() => setActiveTab('checkin')}
            className={`transition-colors py-1 flex items-center gap-1.5 ${
              activeTab === 'checkin'
                ? 'text-amber-300 font-semibold border-b-2 border-amber-400'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>สแกน QR เข้างาน</span>
            <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold ml-0.5">
              หน้างาน
            </span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`transition-all py-1 px-2.5 rounded-xl flex items-center gap-1.5 text-xs sm:text-sm font-semibold border ${
              activeTab === 'admin'
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-bold'
                : 'bg-slate-800/80 text-amber-200 border-amber-500/40 hover:bg-slate-800 hover:text-white hover:border-amber-400'
            }`}
          >
            <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>ช่อง ระบบเจ้าหน้าที่: ตรวจสอบ · อนุมัติ · เเก้ไข</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-xs text-amber-200/90 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
            <span>ที่นั่งแล้ว {totalOccupied} / {totalSeats}</span>
            <span aria-hidden="true" className="text-amber-400/40">·</span>
            <span className="text-emerald-400">ว่าง {totalSeats - totalOccupied} ที่</span>
          </div>

          <button
            onClick={onStartRegistration}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 hover:from-amber-100 hover:to-amber-300 rounded-xl shadow-md shadow-amber-950/40 transition-all transform active:scale-98 whitespace-nowrap flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-900" />
            <span>เริ่มลงทะเบียน</span>
          </button>
        </div>
      </div>

      {/* Mobile subnav */}
      <div className="flex md:hidden border-t border-slate-800 bg-slate-950 px-2 py-2 overflow-x-auto text-xs justify-around">
        <button
          onClick={() => setActiveTab('register')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            activeTab === 'register' ? 'bg-amber-400/20 text-amber-300 font-medium' : 'text-slate-400'
          }`}
        >
          ลงทะเบียน
        </button>
        <button
          onClick={() => setActiveTab('floorplan')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            activeTab === 'floorplan' ? 'bg-amber-400/20 text-amber-300 font-medium' : 'text-slate-400'
          }`}
        >
          ผัง 12 โต๊ะ
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
            activeTab === 'search' ? 'bg-amber-400/20 text-amber-300 font-medium' : 'text-slate-400'
          }`}
        >
          ค้นหาบัตร
        </button>
        <button
          onClick={() => setActiveTab('checkin')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap flex items-center gap-1 ${
            activeTab === 'checkin' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40' : 'text-emerald-400'
          }`}
        >
          <QrCode className="w-3 h-3" />
          <span>สแกน QR</span>
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap font-bold flex items-center gap-1 ${
            activeTab === 'admin' ? 'bg-amber-400 text-slate-950 shadow' : 'bg-slate-900 text-amber-300 border border-amber-500/30'
          }`}
        >
          <UserCheck className="w-3 h-3" />
          <span>จนท. ตรวจสอบ·อนุมัติ·แก้ไข</span>
        </button>
      </div>
    </header>
  );
};
