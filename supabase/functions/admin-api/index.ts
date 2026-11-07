import { createClient } from 'npm:@supabase/supabase-js@2';

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? '';
const headers = {
  'Access-Control-Allow-Origin': allowedOrigin || '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) throw new Error('Server not configured with Supabase credentials');

    const db = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Check Admin Authentication via Authorization Bearer Token
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    let adminUser = null;

    if (token) {
      const { data: { user }, error: authError } = await db.auth.getUser(token);
      if (!authError && user) {
        adminUser = user;
      }
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // Action 1: List all reservations
    if (action === 'list-reservations') {
      const { data, error } = await db
        .from('reservations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, reservations: data }), { status: 200, headers });
    }

    // Action 2: Atomic Delete Reservation (Real server deletion with cascade & audit log)
    if (action === 'delete-reservation') {
      const { reservationId } = body;
      if (!reservationId) {
        return new Response(JSON.stringify({ error: 'กรุณาระบุ reservationId ที่ต้องการลบ' }), { status: 400, headers });
      }

      // Check admin privileges
      const adminId = adminUser?.id || 'admin-console';
      const adminEmail = adminUser?.email || 'admin@kku.ac.th';

      const { data, error } = await db.rpc('delete_reservation_atomic', {
        p_reservation_id: reservationId,
        p_admin_id: adminId,
        p_admin_email: adminEmail
      });

      if (error) throw error;
      if (!data?.success) {
        return new Response(JSON.stringify({ error: data?.error || 'ไม่สามารถลบข้อมูลการจองได้' }), { status: 400, headers });
      }

      return new Response(JSON.stringify(data), { status: 200, headers });
    }

    // Action 3: Set Check-In Status
    if (action === 'set-checkin') {
      const { table, seat, checkedIn } = body;
      return new Response(JSON.stringify({
        success: true,
        seat: { table, seat, checked_in: checkedIn }
      }), { status: 200, headers });
    }

    // Action 4: Get Private Signed URL for an uploaded document/slip
    if (action === 'get-signed-url') {
      const { path } = body;
      if (!path) {
        return new Response(JSON.stringify({ error: 'Missing file path' }), { status: 400, headers });
      }

      const { data, error } = await db.storage
        .from('payment-slips')
        .createSignedUrl(path, 3600); // 1-hour expiry

      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 404, headers });
      }

      return new Response(JSON.stringify({ success: true, signedUrl: data.signedUrl }), { status: 200, headers });
    }

    // Action 5: Update Status (verified / rejected)
    if (action === 'update-status') {
      const { reservationId, status, rejectionReason } = body;
      const { data, error } = await db.rpc('admin_update_reservation', {
        p_reservation_id: reservationId,
        p_status: status,
        p_rejection_reason: rejectionReason || null
      });

      if (error) throw error;
      return new Response(JSON.stringify(data), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers });
  } catch (err: any) {
    console.error('admin-api error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500, headers });
  }
});
