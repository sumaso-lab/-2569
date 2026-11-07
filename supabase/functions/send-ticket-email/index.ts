import { createClient } from 'npm:@supabase/supabase-js@2';

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? '';
const headers = {
  'Access-Control-Allow-Origin': allowedOrigin || '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store'
};

interface SendEmailPayload {
  action: 'send-ticket-pass' | 'send-reminder-24h';
  reservationId: string;
  recipientEmail?: string;
  recipientName?: string;
  seats?: Array<{ table: number; seat: number; ticketCode: string; guestName: string }>;
  eventDetails?: {
    date: string;
    time: string;
    venue: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const body: SendEmailPayload = await req.json().catch(() => ({}));
    const { action, reservationId, recipientEmail, recipientName, seats } = body;

    if (!reservationId) {
      return new Response(JSON.stringify({ error: 'Missing reservationId' }), { status: 400, headers });
    }

    let db: any = null;
    let reservation: any = null;
    if (supabaseUrl && supabaseServiceKey) {
      db = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { data } = await db.from('reservations').select('*').eq('id', reservationId).single();
      reservation = data;
    }

    const emailTo = recipientEmail || reservation?.email;
    const bookerName = recipientName || reservation?.main_booker || 'ผู้ร่วมงาน';
    const assignedSeats = seats || (reservation?.guests || []).map((g: any, idx: number) => {
      const assign = reservation?.assignments?.[idx];
      return {
        table: assign?.table || g.table || 0,
        seat: assign?.seat || g.seat || 0,
        ticketCode: g.ticketCode || `GRAD69-T${String(assign?.table || 0).padStart(2, '0')}S${String(assign?.seat || 0).padStart(2, '0')}`,
        guestName: g.name
      };
    });

    if (!emailTo) {
      return new Response(JSON.stringify({ error: 'ไม่พบที่อยู่อีเมลผู้รับ' }), { status: 400, headers });
    }

    const isReminder = action === 'send-reminder-24h';
    const subject = isReminder
      ? `[เตือนก่อนวันงาน 1 วัน] บัตรเข้างาน Digital Gala Pass — บัณฑิตพยาบาล มข. 2569 (${reservationId})`
      : `[ยืนยันสิทธิ์สำเร็จ] บัตรเข้างาน Digital Gala Pass — ราตรีบัณฑิตพยาบาล มข. 2569 (${reservationId})`;

    const seatBadgesHtml = assignedSeats.map((s: any) => `
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
        <div style="font-weight: bold; color: #1e293b; font-size: 15px;">${s.guestName}</div>
        <div style="color: #b45309; font-weight: bold; font-size: 14px; margin-top: 4px;">
          โต๊ะที่ ${s.table} · ที่นั่งที่ ${s.seat}
        </div>
        <div style="font-family: monospace; font-size: 12px; color: #64748b; margin-top: 2px;">
          E-Ticket Code: <strong>${s.ticketCode}</strong>
        </div>
      </div>
    `).join('');

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`GRAD69:${reservationId}`)}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
      </head>
      <body style="font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f1f5f9; padding: 24px; margin: 0;">
        <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a, #0f172a); padding: 32px 24px; text-align: center; color: #ffffff;">
              <div style="font-size: 13px; letter-spacing: 2px; color: #fbbf24; text-transform: uppercase; font-weight: bold; margin-bottom: 8px;">
                FACULTY OF NURSING · KHON KAEN UNIVERSITY
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: bold; color: #ffffff;">
                บัตรเข้างานราตรีสัมพันธ์บัณฑิตพยาบาล 2569
              </h1>
              <div style="font-size: 14px; color: #94a3b8; margin-top: 6px;">
                Graduation Gala Night & Celebration
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <p style="font-size: 16px; color: #334155; margin-top: 0;">
                เรียนคุณ <strong>${bookerName}</strong>,
              </p>
              <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                ${isReminder
                  ? 'ขอเตือนความจำสำหรับงานฉลองยินดีบัณฑิตพยาบาล มหาวิทยาลัยขอนแก่น ประจำปี 2569 ที่จะจัดขึ้นในวันพรุ่งนี้ กรุณาแสดงบัตรดิจิทัล E-Ticket หรือ QR Code ณ จุดลงทะเบียน'
                  : 'เจ้าหน้าที่ได้ทำการตรวจสอบและอนุมัติการลงทะเบียนและสลิปชำระเงินของท่านเรียบร้อยแล้ว รายละเอียดบัตรและที่นั่งของท่านมีดังนี้:'}
              </p>

              <div style="background-color: #fefce8; border: 1px solid #fde047; border-radius: 12px; padding: 16px; margin: 20px 0;">
                <div style="font-weight: bold; color: #854d0e; font-size: 15px; margin-bottom: 8px;">
                  🗓️ กำหนดการจัดงาน
                </div>
                <div style="font-size: 13px; color: #713f12; line-height: 1.6;">
                  <div>• <strong>วันจัดงาน:</strong> วันอาทิตย์ที่ 21 ธันวาคม 2569</div>
                  <div>• <strong>เวลา:</strong> 18.00 - 22.00 น. (เปิดโต๊ะลงทะเบียน 17.30 น.)</div>
                  <div>• <strong>สถานที่:</strong> ห้องแกรนด์บอลรูม โรงแรมราชาวดี รีสอร์ท แอนด์ โฮเทล ขอนแก่น</div>
                  <div>• <strong>การแต่งกาย:</strong> ชุดราตรี / สากลนิยม / สีทอง-น้ำเงินกรมท่า</div>
                </div>
              </div>

              <div style="text-align: center; margin: 24px 0;">
                <div style="display: inline-block; padding: 12px; background: white; border: 2px dashed #cbd5e1; border-radius: 12px;">
                  <img src="${qrUrl}" width="160" height="160" alt="Fast Check-in QR" style="display: block; margin: 0 auto;" />
                  <div style="font-family: monospace; font-size: 12px; color: #64748b; margin-top: 6px;">
                    Fast Check-in Code: ${reservationId}
                  </div>
                </div>
              </div>

              <h3 style="font-size: 15px; color: #1e293b; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
                🎟️ รายละเอียดที่นั่งที่ได้รับการจัดสรร
              </h3>
              ${seatBadgesHtml}

              <div style="margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; font-size: 12px; color: #64748b; line-height: 1.6;">
                <strong>ข้อควรปฏิบัติในการเข้าร่วมงาน:</strong><br>
                1. สามารถบันทึกภาพหน้าจออีเมลนี้เพื่อแสดงต่อเจ้าหน้าที่จุดลงทะเบียน<br>
                2. หากมีข้อสงสัยหรือต้องการปรับเปลี่ยนที่นั่ง กรุณาติดต่อสายด่วนเจ้าหน้าที่ 095-186-4940<br>
                3. โต๊ะจัดเลี้ยงเป็นแบบโต๊ะกลม 8 ท่าน จัดสรรตามผังที่กำหนด
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
              คณะพยาบาลศาสตร์ มหาวิทยาลัยขอนแก่น · Faculty of Nursing, Khon Kaen University<br>
              ระบบสำรองที่นั่งและบัตรดิจิทัลงานราตรีบัณฑิต 2569
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Real sending via Resend if API key is provided
    let emailStatus = 'pending';
    let emailErrorMsg: string | null = null;
    let resendResponseData = null;

    if (resendApiKey) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Graduation Gala KKU <onboarding@resend.dev>',
            to: [emailTo],
            subject: subject,
            html: htmlContent
          })
        });

        const resendJson = await resendRes.json();
        if (!resendRes.ok) {
          throw new Error(resendJson?.message || `Resend error code ${resendRes.status}`);
        }
        emailStatus = 'sent';
        resendResponseData = resendJson;
      } catch (sendErr: any) {
        emailStatus = 'failed';
        emailErrorMsg = sendErr.message || 'Error communicating with Resend API';
      }
    } else {
      // Secret not yet configured in Supabase Edge Function Secrets
      emailStatus = 'simulated_no_secret';
      emailErrorMsg = 'ยังไม่ได้ตั้งค่า Secret RESEND_API_KEY ใน Supabase Edge Function Secrets (ระบบจำลองการสร้างบัตรอีเมลพร้อมเนื้อหา HTML สมบูรณ์)';
    }

    // Save dispatch record to audit_logs if DB client exists
    if (db) {
      try {
        await db.from('audit_logs').insert({
          action: isReminder ? 'EMAIL_REMINDER_24H' : 'EMAIL_TICKET_PASS',
          target_id: reservationId,
          details: {
            recipientEmail: emailTo,
            recipientName: bookerName,
            status: emailStatus,
            errorMessage: emailErrorMsg,
            resendData: resendResponseData,
            timestamp: new Date().toISOString()
          }
        });
      } catch (auditErr) {
        console.warn('Could not write email audit log:', auditErr);
      }
    }

    return new Response(JSON.stringify({
      success: emailStatus === 'sent' || emailStatus === 'simulated_no_secret',
      status: emailStatus,
      recipient: emailTo,
      subject: subject,
      errorMessage: emailErrorMsg,
      resendId: resendResponseData?.id || null
    }), { status: 200, headers });

  } catch (err: any) {
    console.error('send-ticket-email error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500, headers });
  }
});
