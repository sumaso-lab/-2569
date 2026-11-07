import React from 'react';
import { Calendar, Clock, MapPin, Users, Ticket, ArrowRight, ShieldCheck, Sparkles, PhoneCall, ExternalLink } from 'lucide-react';
import galaHeroBanner from '../assets/images/kku_nurse_master_gala_1793617507308.jpg';
import { KKUNursingLogo } from './KKUNursingLogo';

interface HeroSectionProps {
  onStartBooking: () => void;
  onViewFloorPlan: () => void;
  totalOccupied: number;
  totalSeats: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartBooking,
  onViewFloorPlan,
  totalOccupied,
  totalSeats
}) => {
  const availableSeats = Math.max(0, totalSeats - totalOccupied);
  const percentBooked = Math.round((totalOccupied / totalSeats) * 100);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-amber-500/40 bg-slate-950 text-white shadow-2xl shadow-slate-950/60 mb-10">
      {/* Background with Generated Hero Banner and Dark Scrim */}
      <div className="absolute inset-0 z-0">
        <img
          src={galaHeroBanner}
          alt="งานฉลองยินดีมหาบัณฑิตพยาบาล มข. ป.โท กาล่าดินเนอร์"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-25 scale-105 transform filter blur-[1px]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-950/70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,170,77,0.18)_0%,transparent_70%)]" />
      </div>

      {/* Decorative Thai Celestial Ornaments */}
      <div className="absolute top-5 left-6 text-amber-300/40 text-lg tracking-widest hidden sm:block font-serif-thai">
        ❀ ✦ ❀
      </div>
      <div className="absolute bottom-5 right-6 text-amber-300/40 text-lg tracking-widest hidden sm:block font-serif-thai">
        ❀ ✦ ❀
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 sm:py-16 text-center">
        {/* Crest Emblem */}
        <div className="flex justify-center mb-5">
          <KKUNursingLogo size="lg" />
        </div>

        {/* Thai Gala Kicker */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-400/20 to-amber-500/20 border border-amber-400/40 text-amber-200 text-xs sm:text-sm font-semibold tracking-wider uppercase mb-3 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>FACULTY OF NURSING · KHON KAEN UNIVERSITY ๒๕๖๙</span>
        </div>

        {/* Main Title */}
        <h1 className="font-serif-thai text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-200 to-amber-400 drop-shadow-sm mb-3">
          ยินดี<span className="text-white">มหาบัณฑิตพยาบาล</span> ๒๕๖๙
        </h1>

        <p className="font-serif-thai italic text-lg sm:text-2xl text-amber-100/90 mb-4 max-w-2xl mx-auto">
          “ระดับปริญญาโท · คณะพยาบาลศาสตร์ มหาวิทยาลัยขอนแก่น”
        </p>

        {/* Grand Photo Showcase of Master Graduates in authentic KKU Gown */}
        <div className="relative max-w-3xl mx-auto mb-8 rounded-2xl overflow-hidden border-2 border-amber-400/50 shadow-2xl shadow-amber-950/60 group">
          <img
            src={galaHeroBanner}
            alt="มหาบัณฑิตพยาบาล มข. (ป.โท) ในชุดครุยวิทยฐานะตามแบบคณะพยาบาลศาสตร์ มข."
            referrerPolicy="no-referrer"
            className="w-full h-56 sm:h-80 object-cover object-center group-hover:scale-102 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/30 pointer-events-none" />
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-left">
            <div>
              <span className="text-amber-300 font-serif-thai font-bold text-sm sm:text-base flex items-center gap-1.5 drop-shadow">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>มหาบัณฑิตพยาบาลศาสตร์ มหาวิทยาลัยขอนแก่น (ป.โท) ในชุดครุยผ้าโปร่งขาววิทยฐานะ</span>
              </span>
              <span className="text-slate-300 text-[11px] block">
                ห้องแกรนด์บอลรูม โรงแรมราชาวดี ขอนแก่น · โต๊ะจีนหรู 12 โต๊ะ (โต๊ะละ 8 ที่นั่ง · 96 ที่นั่ง)
              </span>
            </div>
            <span className="px-3 py-1 bg-amber-500/90 text-slate-950 font-bold rounded-full text-xs shadow hidden sm:inline-block">
              21 ธ.ค. 2569
            </span>
          </div>
        </div>

        <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
          ขอเชิญมหาบัณฑิตพยาบาล (ป.โท) ดุษฎีบัณฑิต คณาจารย์ และครอบครัวผู้มีเกียรติ ร่วมงานเลี้ยงฉลองความสำเร็จ
          ณ โรงแรมราชาวดี ขอนแก่น พร้อมเปิดให้สำรองโต๊ะจีนและเลือกที่นั่งระบุบุคคลล่วงหน้า (12 โต๊ะ 96 ที่นั่ง)
        </p>

        {/* Key Event Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mb-8 text-left text-xs sm:text-sm">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <Calendar className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="block text-slate-400 text-[11px]">วันจัดงาน</span>
              <span className="font-bold text-amber-300">21 ธันวาคม 2569</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="block text-slate-400 text-[11px]">เวลาจัดงาน</span>
              <span className="font-medium text-slate-100">18.00 – 22.00 น.</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <MapPin className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="block text-slate-400 text-[11px]">สถานที่จัดงาน</span>
              <span className="font-medium text-slate-100">โรงแรมราชาวดี ขอนแก่น</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <Ticket className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="block text-slate-400 text-[11px]">อัตราค่าลงทะเบียน</span>
              <span className="font-medium text-amber-300">799 บาท / ท่าน</span>
            </div>
          </div>
        </div>

        {/* Inquiry Contact & Rachawadee Hotel Location Map Card */}
        <div className="max-w-4xl mx-auto mb-8 bg-slate-900/90 rounded-3xl border border-amber-500/40 p-4 sm:p-6 text-left shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <span className="text-[11px] font-bold text-amber-300 tracking-wider uppercase flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>สถานที่จัดงาน · VENUE & LOCATION MAP</span>
              </span>
              <h3 className="font-serif-thai text-lg sm:text-xl font-bold text-white mt-0.5">
                โรงแรมราชาวดี ขอนแก่น แอร์พอร์ต โฮเทล (Rachawadee Khonkaen Airport Hotel)
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                ห้องแกรนด์บอลรูม · 99 ม.20 ถ.สนามบิน ต.บ้านเป็ด อ.เมืองขอนแก่น จ.ขอนแก่น
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href="tel:0951864940"
                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="โทรสอบถามข้อมูลงาน"
              >
                <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
                <span>สอบถามเพิ่มเติม: 0951864940</span>
              </a>

              <a
                href="https://www.google.com/maps/place/Rachawadee+Khonkaen+Airport+Hotel/@16.460217,102.7838134,17z/data=!3m1!4b1!4m9!3m8!1s0x312261cbd71eca59:0xc4e42f5f77ff1dbe!5m2!4m1!1i2!8m2!3d16.460217!4d102.7863883!16s%2Fg%2F1tkb2l2h?entry=ttu&g_ep=EgoyMDI2MTAyOC4wIKXMDSoASAFQAw%3D%3D"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-bold shadow flex items-center gap-1.5 transition-all"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>เปิดแผนที่ Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Embedded Google Maps Preview */}
          <div className="mt-4 rounded-2xl overflow-hidden border border-slate-700 aspect-video sm:aspect-[21/9] max-h-60 relative shadow-inner">
            <iframe
              title="แผนที่โรงแรมราชาวดี ขอนแก่น"
              src="https://maps.google.com/maps?q=16.460217,102.7863883&hl=th&z=16&output=embed"
              className="w-full h-full border-0 filter brightness-95 contrast-105"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
              <span className="text-[10px] text-slate-900 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg font-medium shadow">
                📍 จุดจัดงาน: โรงแรมราชาวดี ขอนแก่น (ใกล้สนามบินขอนแก่น)
              </span>
            </div>
          </div>
        </div>

        {/* Capacity Bar & CTAs */}
        <div className="max-w-xl mx-auto mb-8 bg-slate-900/90 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400" />
              <span>ความจุทั้งหมด: 12 โต๊ะ ({totalSeats} ที่นั่ง · โต๊ะละ 8 ที่)</span>
            </span>
            <span className="text-amber-300 font-semibold">
              จองแล้ว {totalOccupied} ที่ ({percentBooked}%) · ว่าง {availableSeats} ที่
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, percentBooked)}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <button
            onClick={onStartBooking}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 hover:from-amber-100 hover:to-amber-300 text-slate-950 font-bold rounded-2xl shadow-xl shadow-amber-950/50 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <span>ลงทะเบียนและสำรองที่นั่ง</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </button>

          <button
            onClick={onViewFloorPlan}
            className="w-full sm:w-auto px-6 py-4 bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-semibold rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <span>ดูผังที่นั่งห้องจัดเลี้ยง (12 โต๊ะ)</span>
          </button>
        </div>

        {/* Trust badge */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ระบบสำรองที่นั่งรายบุคคล
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>ออกบัตร Digital Pass ทันที</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>สิทธิ์เลือกโต๊ะทันทีหลังเจ้าหน้าที่ตรวจสอบและอนุมัติสลิป</span>
        </div>
      </div>
    </section>
  );
};
