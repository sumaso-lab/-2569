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

    const body = await req.json().catch(() => ({}));
    const { reservationId, fileName, fileBase64, mimeType } = body;

    if (!reservationId || !fileName || !fileBase64) {
      return new Response(JSON.stringify({ error: 'Missing reservationId, fileName, or fileBase64' }), { status: 400, headers });
    }

    // Decode base64 file data
    const rawData = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
    const binaryStr = atob(rawData);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const cleanName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = `${reservationId}/${cleanName}`;
    const contentType = mimeType || (fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

    const { data: uploadData, error: uploadError } = await db.storage
      .from('payment-slips')
      .upload(filePath, bytes, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error in edge function:', uploadError);
      throw uploadError;
    }

    // Update reservation record with the storage path
    await db
      .from('reservations')
      .update({
        slip_url: uploadData.path,
        slip_file_name: fileName
      })
      .eq('id', reservationId);

    return new Response(JSON.stringify({
      success: true,
      path: uploadData.path,
      fileName
    }), { status: 200, headers });
  } catch (err: any) {
    console.error('upload-payment-slip error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to upload payment slip' }), { status: 400, headers });
  }
});
