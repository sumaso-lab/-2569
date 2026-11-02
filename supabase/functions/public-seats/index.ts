import { createClient } from 'npm:@supabase/supabase-js@2';
const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? '';
const headers = { 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
Deno.serve(async req => {
  if (!allowedOrigin || req.headers.get('origin') !== allowedOrigin) return new Response('Forbidden', { status: 403 });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) throw Error('Server not configured');
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.rpc('list_public_seats');
    if (error) throw error;
    return new Response(JSON.stringify({ seats: data }), { status: 200, headers });
  } catch (error) {
    console.error('public-seats failed', error);
    return new Response(JSON.stringify({ error: 'ไม่สามารถโหลดที่นั่งได้' }), { status: 500, headers });
  }
});
