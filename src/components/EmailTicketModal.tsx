import React, { useState } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  Copy,
  Check,
  X,
  PhoneCall,
  ExternalLink,
  ShieldCheck,
  Eye,
  FileText
} from 'lucide-react';
import { KKUNursingLogo } from './KKUNursingLogo';

export interface EmailTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestName: string;
  category: string;
  table: number;
  seat: number;
  ticketCode: string;
  defaultEmail?: string;
  tableName?: string;
}

export const EmailTicketModal: React.FC<EmailTicketModalProps> = ({
  isOpen,
  onClose,
  guestName,
  category,
  table,
  seat,
  ticketCode,
  defaultEmail = 'keerana.w@alumni.ac.th',
  tableName = 'โต๊ะจัดเลี้ยง'
}) => {
  const [recipientEmail, setRecipientEmail] = useState(defaultEmail);
  const [enableReminder, setEnableReminder] = useState(true);
  const [includeMap, setIncludeMap] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [copiedText, setCopiedText] = useState(false);

  if (!isOpen) return null;

  const RACHAWADEE_MAPS_URL =
    'https://www.google.com/maps/place/Rachawadee+Khonkaen+Airport+Hotel/@16.460217,102.7838134,17z/data=!3m1!4b1!4m9!3m8!1s0x312261cbd71eca59:0xc4e42f5f77ff1dbe!5m2!4m1!1i2!8m2!3d16.460217!4d102.7863883!16s%2Fg%2F1tkb2l2h?entry=ttu&g_ep=EgoyMDI2MTAyOC4wIKXMDSoASAFQAw%3D%3D';

  const handleSendEmail = () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      alert('กรุณากรอกที่อยู่อีเมลที่ถูกต้อง');
      return;
    }

    setIsSending(true);

    setTimeout(() => {
      setIsSending(false);
      setSentSuccess(true);

      // Save dispatch history in localStorage
      try {
        const key = 'grad69_email_dispatches';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.unshift({
          ticketCode,
          guestName,
          email: recipientEmail,
          table,
          seat,
          sentAt: new Date().toISOString(),
          reminderScheduledFor: enableReminder ? '2026-12-20T09:00:00+07:00' : null
        });
        localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
      } catch (e) {
        console.error('Failed to log email dispatch:', e);
      }
    }, 900);
  };

  const handleCopyEmailText = () => {
    const text = `[บัตรเข้างานอย่างเป็นทางการ] ยินดีมหาบัณฑิตพยาบาล มข. ๒๕๖๙ (ระดับปริญญาโท)
ผู้เข้าร่วม: ${guestName} (${category})
โต๊ะ: ${table} (${tableName}) | เก้าอี้: ${seat}
รหัสบัตร: ${ticketCode}
วันจัดงาน: วันอาทิตย์ที่ 21 ธันวาคม 2569 เวลา 16.30 - 20.00 น. (ประตูเปิด 16.00 น.)
สถานที่: ห้องแกรนด์บอลรูม โรงแรมราชาวดี ขอนแก่น
แผนที่เดินทาง: ${RACHAWADEE_MAPS_URL}
อัตราค่าลงทะเบียน: 799 บาท / ท่าน
${enableReminder ? 'การแจ้งเตือน: ระบบจะส่งอีเมลเตือนล่วงหน้า 1 วัน ในวันที่ 20 ธ.ค. 2569 เวลา 09.00 น.\n' : ''}สอบถามเพิ่มเติม: 0951864940`;

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-amber-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-between border-b border-amber-500/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-thai text-base sm:text-lg font-bold text-amber-100">
                ส่งบัตรเข้างานไปที่อีเมล & ตั้งเตือน 1 วันก่อนงาน
              </h3>
              <p className="text-[11px] text-slate-400">
                ระบบจัดส่งบัตร Digital Gala Pass และนัดหมายแจ้งเตือนอัตโนมัติ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Target Guest Summary Pill */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-300 font-serif-thai font-bold flex items-center justify-center text-sm shrink-0">
                T{table}
              </div>
              <div>
                <span className="font-bold text-slate-900 text-sm block">{guestName}</span>
                <span className="text-xs text-slate-500">
                  โต๊ะ {table} · เก้าอี้ที่ {seat} ({category})
                </span>
              </div>
            </div>
            <div className="font-mono text-xs px-2.5 py-1 rounded-lg bg-white border border-amber-300 font-bold text-amber-800 self-start sm:self-auto">
              {ticketCode}
            </div>
          </div>

          {/* Form Controls */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                ที่อยู่อีเมลผู้รับบัตร (Recipient Email) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={e => {
                    setRecipientEmail(e.target.value);
                    setSentSuccess(false);
                  }}
                  placeholder="name@university.ac.th หรือ gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm font-medium text-slate-900"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                สามารถส่งเข้าเมลของบัณฑิตเอง หรือส่งเข้าเมลผู้จองหลักได้
              </p>
            </div>

            {/* Checkbox: Reminder 1 day before */}
            <div className="p-4 rounded-2xl border-2 border-amber-400/50 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableReminder}
                  onChange={e => setEnableReminder(e.target.checked)}
                  className="mt-1 w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <div>
                  <span className="font-semibold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>แจ้งเตือนก่อนเข้างาน 1 วัน (20 ธันวาคม 2569 เวลา 09:00 น.)</span>
                  </span>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    ระบบจะส่งอีเมลแจ้งเตือนล่วงหน้า 24 ชม. พร้อมระบุหมายเลขโต๊ะ เก้าอี้ แผนที่ Google Maps
                    โรงแรมราชาวดี ขอนแก่น และคำแนะนำการแต่งกาย
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer pt-2 border-t border-amber-200/60">
                <input
                  type="checkbox"
                  checked={includeMap}
                  onChange={e => setIncludeMap(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <span className="text-xs text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>แนบพิกัด Google Maps โรงแรมราชาวดี ขอนแก่น ในเนื้อหาอีเมล</span>
                </span>
              </label>
            </div>
          </div>

          {/* Success Status Notice */}
          {sentSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 animate-in fade-in duration-300 space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>ส่งบัตรเข้างานไปยัง {recipientEmail} เรียบร้อยแล้ว!</span>
              </div>
              {enableReminder && (
                <div className="text-xs text-emerald-700 flex items-center gap-1 pl-7">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    ระบบตั้งเวลาส่งอีเมลแจ้งเตือนล่วงหน้าในวันที่ <strong>20 ธันวาคม 2569 เวลา 09.00 น.</strong> แล้ว
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Email Preview Section Toggle */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-between border-b border-slate-200 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span>พรีวิวเนื้อหาอีเมลที่จัดส่ง (Email Mockup Preview)</span>
              </span>
              <span className="text-[11px] text-amber-700">{showPreview ? 'ซ่อนพรีวิว ▲' : 'แสดงพรีวิว ▼'}</span>
            </button>

            {showPreview && (
              <div className="p-4 sm:p-5 bg-slate-100 text-slate-800 font-sans text-xs space-y-4">
                {/* Simulated Mail Client Window */}
                <div className="bg-white rounded-xl shadow border border-slate-200 p-4 space-y-3">
                  <div className="border-b border-slate-100 pb-2.5 text-[11px] text-slate-500 space-y-0.5">
                    <div>
                      <strong className="text-slate-700">จาก:</strong> ฝ่ายจัดงาน คณะพยาบาลศาสตร์ มข. &lt;gala-pass@nu.kku.ac.th&gt;
                    </div>
                    <div>
                      <strong className="text-slate-700">ถึง:</strong> {recipientEmail}
                    </div>
                    <div>
                      <strong className="text-slate-700">หัวข้อ:</strong> [บัตรเข้างาน] งานยินดีมหาบัณฑิตพยาบาล มข. ๒๕๖๙ - โต๊ะ {table} เก้าอี้ {seat}
                    </div>
                    {enableReminder && (
                      <div className="text-amber-700 font-medium pt-0.5">
                        <strong className="text-slate-700">นัดหมายเตือน:</strong> 20 ธันวาคม 2569 เวลา 09.00 น. (1 วันก่อนงาน)
                      </div>
                    )}
                  </div>

                  {/* Email Styled Letterhead */}
                  <div className="rounded-xl overflow-hidden border border-amber-400/40 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-4">
                    <div className="flex items-center gap-2.5 mb-3 border-b border-amber-500/30 pb-2">
                      <KKUNursingLogo size="sm" />
                      <div>
                        <span className="text-amber-200 font-serif-thai font-bold text-xs block">
                          ยินดีมหาบัณฑิตพยาบาล ๒๕๖๙ · FACULTY OF NURSING KKU
                        </span>
                        <span className="text-[10px] text-slate-400">
                          คณะพยาบาลศาสตร์ มหาวิทยาลัยขอนแก่น (ระดับปริญญาโท)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-slate-200 text-xs">
                        เรียนคุณ <strong>{guestName}</strong> ({category})
                      </div>
                      <p className="text-[11px] text-slate-300">
                        ขอแสดงความยินดีในโอกาสสำเร็จการศึกษา และขอส่งมอบบัตรเกียรติยศเข้างานฉลองมหาบัณฑิต
                      </p>

                      <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/40 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-amber-300 block uppercase">ที่นั่งของคุณ</span>
                          <span className="font-serif-thai text-xl font-bold text-amber-200">
                            โต๊ะ {table} · เก้าอี้ที่ {seat}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {tableName}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-xs text-amber-300 font-bold bg-slate-950 px-2 py-1 rounded border border-amber-500/30">
                            {ticketCode}
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-1">
                            อัตราลงทะเบียน 799 บาท (ชำระแล้ว)
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-300 space-y-1 pt-1">
                        <div>
                          <strong>วันจัดงาน:</strong> 21 ธันวาคม 2569 เวลา 16.30 - 20.00 น. (ประตูเปิด 16.00 น.)
                        </div>
                        <div>
                          <strong>สถานที่:</strong> ห้องแกรนด์บอลรูม โรงแรมราชาวดี ขอนแก่น
                        </div>
                        {includeMap && (
                          <div className="pt-1">
                            <a
                              href={RACHAWADEE_MAPS_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-lg border border-amber-400/40 text-[10px] font-semibold hover:bg-amber-500/30"
                            >
                              <MapPin className="w-3 h-3 text-amber-400" />
                              <span>เปิดแผนที่ Google Maps สู่โรงแรมราชาวดี</span>
                              <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                            </a>
                          </div>
                        )}
                        <div className="pt-1 text-slate-400 text-[10px]">
                          <strong>สอบถามเพิ่มเติม:</strong> 0951864940 · คณะพยาบาลศาสตร์ มหาวิทยาลัยขอนแก่น
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyEmailText}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            {copiedText ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">คัดลอกข้อความแล้ว</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>คัดลอกข้อความบัตร</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-medium transition-colors"
            >
              ปิดหน้าต่าง
            </button>

            <button
              type="button"
              onClick={handleSendEmail}
              disabled={isSending}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>กำลังจัดส่งอีเมล...</span>
                </>
              ) : sentSuccess ? (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>ส่งซ้ำอีกครั้ง</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>ส่งบัตรเข้างาน & ตั้งเตือน</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
