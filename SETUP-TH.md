# ขั้นตอนติดตั้งระบบจองจริง (ต้องทำก่อนเปิดให้ผู้ใช้)

1. เปิด Supabase → SQL Editor → New query แล้ววางเนื้อหา `supabase/sql/01_reservations.sql` → Run (ตรวจสอบผลก่อนใช้จริง)
2. Supabase → Edge Functions → Deploy a new function ชื่อ `public-seats` วาง `supabase/functions/public-seats/index.ts` แล้ว Deploy
3. Function `public-seats` → Settings → ปิด Verify JWT with legacy secret แล้ว Save (เหมือน `create-reservation`)
4. Edge Functions → Secrets ตรวจว่ามี `ALLOWED_ORIGIN=https://sumaso-lab.github.io` และ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY โดย **ห้ามส่งค่า secret ในแชต**
5. อัปโหลดไฟล์เว็บไซต์ที่แก้แล้วขึ้น GitHub repo เดิม (อย่าอัปโหลดไฟล์ secrets หรือ .env)
6. ทดสอบเปิดจากเบราว์เซอร์ 2 เครื่อง: โหลดที่นั่ง → จอง 1 ที่ → อีกเครื่องเห็นชื่อแรกและเลือกที่นั่งเดิมไม่ได้ → ทดลองจองซ้ำต้องได้ 409

## ข้อจำกัดสำคัญก่อนเปิดจริง
- ส่วนชำระเงินเดิมมีบัญชีและ QR ตัวอย่าง: **ยังห้ามให้ผู้ใช้โอนเงินตามหน้านั้น** ต้องยืนยันบัญชีจริงและสร้าง QR รับเงินจริง
- การอัปโหลดสลิปในเว็บเป็นเพียงภาพตัวอย่างในเบราว์เซอร์ ยังไม่ส่งสลิปเข้า Storage เพื่อให้ผู้ดูแลตรวจสอบ; รายการจองบันทึกสถานะ pending เสมอ
- หน้า Admin / Check-in เดิมไม่ได้ใช้ระบบยืนยันตัวตน: ไม่ควรใช้เป็นหน้าจัดการข้อมูลจริง; ปุ่มเปลี่ยนสถานะและลบถูกปิดไว้
- การตรวจ Origin อย่างเดียวไม่ป้องกันสคริปต์ภายนอกปลอม header: ก่อนเปิดสาธารณะควรเพิ่ม CAPTCHA / rate limit ฝั่ง Edge Function
- อย่าทดสอบจองจริงก่อน SQL + Edge Function public-seats พร้อม เพราะระบบจะปิดการยืนยันจองเพื่อป้องกันข้อมูลผิดพลาด
