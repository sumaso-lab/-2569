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
    if (!url || !serviceKey) throw new Error('Server not configured');

    const db = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const payload = await req.json().catch(() => ({}));

    // 1. Atomically register reservation and reserve seats in DB
    const { data: resId, error: rpcError } = await db.rpc('create_reservation_atomic', { payload });
    if (rpcError) throw rpcError;

    // 2. If slipUrl or storage_path is provided, persist it in the reservation record
    if (payload.slipUrl || payload.storagePath) {
      await db
        .from('reservations')
        .update({
          slip_url: payload.storagePath || payload.slipUrl,
          slip_file_name: payload.slipFileName || 'slip.jpg'
        })
        .eq('id', payload.id);
    }

    return new Response(JSON.stringify({ success: true, reservationId: resId }), { status: 200, headers });
  } catch (err: any) {
    console.error('create-reservation error:', err);
    return new Response(JSON.stringify({ error: err.message || 'ไม่สามารถทำการจองได้' }), { status: 400, headers });
  }
});
