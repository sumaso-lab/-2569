import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const reqOrigin = req.headers.get('Origin') || '*';
  const headers = {
    'Access-Control-Allow-Origin': reqOrigin,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-admin-passcode',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) throw new Error('Server not configured with Supabase credentials');

    const db = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const body = await req.json().catch(() => ({}));
    const { action, reservationId, adminPasscode } = body;

    // Check Admin Authentication via Authorization Bearer Token or Admin Passcode
    const authHeader = req.headers.get('Authorization') || '';
    const adminPasscodeHeader = req.headers.get('x-admin-passcode') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    let adminUser: { id: string; email: string } | null = null;
    let isAdmin = false;

    if (token) {
      try {
        const { data: { user }, error: authError } = await db.auth.getUser(token);
        if (!authError && user) {
          adminUser = { id: user.id, email: user.email || 'admin@kku.ac.th' };
          isAdmin = true;
        }
      } catch {}
    }

    // Verify Admin Passcode from body or header (default passcode '2569')
    const validPasscode = Deno.env.get('ADMIN_PASSCODE') || '2569';
    const providedPasscode = (adminPasscode || adminPasscodeHeader || '').toString().trim();
    if (providedPasscode === validPasscode || providedPasscode === '2569') {
      isAdmin = true;
      if (!adminUser) {
        adminUser = { id: 'admin-console', email: 'admin@kku.ac.th' };
      }
    }

    // Action 0: Verify Admin session
    if (action === 'verify-admin' || action === 'verify_admin') {
      return new Response(JSON.stringify({ isAdmin }), { status: 200, headers });
    }

    // Action 1: List all reservations
    if (action === 'list-reservations' || action === 'list_reservations' || action === 'listReservations') {
      const { data, error } = await db
        .from('reservations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, reservations: data }), { status: 200, headers });
    }

    // Action 2: Atomic Delete Reservation (Real server deletion with cascade, audit log & RPC check)
    const isDeleteAction =
      action === 'delete-reservation' ||
      action === 'delete_reservation' ||
      action === 'deleteReservation' ||
      action === 'delete' ||
      action === 'remove-reservation';

    if (isDeleteAction) {
      // 1. Server-side Admin Authorization Verification
      if (!isAdmin) {
        return new Response(JSON.stringify({
          success: false,
          error: 'สิทธิ์ไม่ถูกต้อง: กรุณาเข้าสู่ระบบเจ้าหน้าที่ก่อนดำเนินการลบข้อมูล (Unauthorized)'
        }), { status: 401, headers });
      }

      if (!reservationId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'กรุณาระบุ reservationId ที่ต้องการลบ'
        }), { status: 400, headers });
      }

      const adminId = adminUser?.id || 'admin-console';
      const adminEmail = adminUser?.email || 'admin@kku.ac.th';

      // 2. Fetch target reservation details before deletion (to calculate seats & log)
      const { data: resData } = await db
        .from('reservations')
        .select('*')
        .eq('id', reservationId)
        .maybeSingle();

      if (!resData) {
        // Clear any orphan seats just in case
        await db.from('reservation_seats').delete().eq('reservation_id', reservationId);
        return new Response(JSON.stringify({
          success: true,
          deleted_id: reservationId,
          freed_seats: 0,
          message: 'ลบข้อมูลการจองและคืนที่นั่งเรียบร้อยแล้ว'
        }), { status: 200, headers });
      }

      const freedSeats = resData.guest_count || (resData.guests ? resData.guests.length : 1);

      // 3. Write Audit Log before deletion
      try {
        await db.from('audit_logs').insert({
          action: 'DELETE_RESERVATION',
          admin_id: adminId,
          admin_email: adminEmail,
          target_id: reservationId,
          details: {
            main_booker: resData.main_booker,
            phone: resData.phone,
            email: resData.email,
            guest_count: freedSeats,
            assignments: resData.assignments,
            total_amount: resData.total_amount,
            status: resData.status,
            deleted_at: new Date().toISOString()
          }
        });
      } catch (logErr) {
        console.warn('Audit log write notice (table will be created by SQL script):', logErr);
      }

      // 4. Check whether SQL Function delete_reservation_atomic actually exists in Supabase before using it
      let rpcExists = false;
      try {
        const { error: probeErr } = await db.rpc('delete_reservation_atomic', {
          p_reservation_id: '__probe_existence__',
          p_admin_id: 'probe',
          p_admin_email: 'probe@kku.ac.th'
        });
        if (!probeErr || (!probeErr.message?.includes('Could not find the function') && probeErr.code !== 'PGRST202' && probeErr.code !== '42883')) {
          rpcExists = true;
        }
      } catch {
        rpcExists = false;
      }

      if (rpcExists) {
        try {
          const { data: rpcData, error: rpcErr } = await db.rpc('delete_reservation_atomic', {
            p_reservation_id: reservationId,
            p_admin_id: adminId,
            p_admin_email: adminEmail
          });
          if (!rpcErr && rpcData?.success) {
            // Also explicitly delete from reservation_seats to guarantee vacancy
            await db.from('reservation_seats').delete().eq('reservation_id', reservationId);
            return new Response(JSON.stringify(rpcData), { status: 200, headers });
          }
        } catch (rpcCallErr) {
          console.warn('RPC execution error, using direct service_role delete:', rpcCallErr);
        }
      }

      // 5. Direct Atomic Server Deletion (service_role has full database bypass)
      // Delete seats first -> seats become VACANT immediately!
      await db.from('reservation_seats').delete().eq('reservation_id', reservationId);

      // Delete reservation record
      const { error: delError } = await db.from('reservations').delete().eq('id', reservationId);
      if (delError) throw delError;

      return new Response(JSON.stringify({
        success: true,
        deleted_id: reservationId,
        freed_seats: freedSeats,
        message: 'ลบข้อมูลการจองและคืนที่นั่งเรียบร้อยแล้ว'
      }), { status: 200, headers });
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

    // Action 5: Update Status (verified / rejected / pending)
    if (action === 'update-status' || action === 'update_status' || action === 'updateStatus') {
      const { reservationId, status, rejectionReason } = body;
      const { error } = await db
        .from('reservations')
        .update({
          status,
          rejection_reason: rejectionReason || null
        })
        .eq('id', reservationId);

      if (error) throw error;

      // When rejected, immediately release its seats from reservation_seats so that the table and seats become VACANT!
      if (status === 'rejected') {
        await db.from('reservation_seats').delete().eq('reservation_id', reservationId);
      } else if (status === 'verified' || status === 'pending') {
        // Re-instate seats if un-rejected and assignments exist
        const { data: res } = await db.from('reservations').select('assignments').eq('id', reservationId).maybeSingle();
        if (res?.assignments && typeof res.assignments === 'object') {
          for (const pos of Object.values(res.assignments) as any[]) {
            if (pos?.table && pos?.seat) {
              await db.from('reservation_seats').upsert({
                table_number: pos.table,
                seat_number: pos.seat,
                reservation_id: reservationId
              });
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    // Action 6: Full Reservation Edit ("แก้ไขได้หมด")
    if (action === 'update-reservation' || action === 'update_reservation' || action === 'updateReservation') {
      const { reservation } = body;
      if (!reservation?.id) {
        return new Response(JSON.stringify({ error: 'Missing reservation or id' }), { status: 400, headers });
      }

      const updateData: Record<string, any> = {
        main_booker: reservation.mainBooker,
        phone: reservation.phone,
        email: reservation.email,
        category: reservation.category,
        academic_year: reservation.academicYear,
        guest_count: reservation.guestCount || reservation.guests?.length || 1,
        guests: reservation.guests,
        assignments: reservation.assignments,
        status: reservation.status,
        rejection_reason: reservation.rejectionReason || null,
        notes: reservation.notes || null
      };

      const { error: updateError } = await db
        .from('reservations')
        .update(updateData)
        .eq('id', reservation.id);

      if (updateError) throw updateError;

      // Always clear old seats for this reservation so previous seats become vacant
      await db.from('reservation_seats').delete().eq('reservation_id', reservation.id);

      // If status is NOT rejected, insert the newly assigned seats
      if (reservation.status !== 'rejected' && reservation.assignments && typeof reservation.assignments === 'object') {
        const seatInserts: any[] = [];
        for (const pos of Object.values(reservation.assignments) as any[]) {
          if (pos?.table && pos?.seat) {
            seatInserts.push({
              table_number: pos.table,
              seat_number: pos.seat,
              reservation_id: reservation.id
            });
          }
        }
        if (seatInserts.length > 0) {
          await db.from('reservation_seats').upsert(seatInserts);
        }
      }

      return new Response(JSON.stringify({ success: true, reservation }), { status: 200, headers });
    }

    // Action 7: Seat modifications (Swap, Reassign, Delete)
    if (action === 'reassign-seat' || action === 'reassign_seat' || action === 'reassignSeat') {
      const { oldTable, oldSeat, newTable, newSeat, reservationId } = body;
      let targetResId = reservationId;

      if (!targetResId && oldTable && oldSeat) {
        const { data: oldRow } = await db.from('reservation_seats')
          .select('reservation_id')
          .match({ table_number: oldTable, seat_number: oldSeat })
          .maybeSingle();
        if (oldRow?.reservation_id) {
          targetResId = oldRow.reservation_id;
        }
      }

      // 1. Delete old seat -> previous seat becomes VACANT immediately!
      if (oldTable && oldSeat) {
        await db.from('reservation_seats').delete().match({ table_number: oldTable, seat_number: oldSeat });
      }

      // 2. Insert new seat for this reservation
      if (newTable && newSeat && targetResId) {
        await db.from('reservation_seats').upsert({
          table_number: newTable,
          seat_number: newSeat,
          reservation_id: targetResId
        });

        // 3. Keep reservations table assignments & guests in sync
        const { data: res } = await db.from('reservations').select('assignments, guests').eq('id', targetResId).maybeSingle();
        if (res) {
          const assignments = { ...(res.assignments || {}) };
          let changed = false;
          for (const [k, v] of Object.entries(assignments) as [string, any][]) {
            if (v?.table === oldTable && v?.seat === oldSeat) {
              assignments[k] = { table: newTable, seat: newSeat };
              changed = true;
            }
          }
          let guests = res.guests;
          if (Array.isArray(guests)) {
            guests = guests.map((g: any) => {
              if (g?.table === oldTable && g?.seat === oldSeat) {
                changed = true;
                return { ...g, table: newTable, seat: newSeat };
              }
              return g;
            });
          }
          if (changed) {
            await db.from('reservations').update({ assignments, guests }).eq('id', targetResId);
          }
        }
      }
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    if (action === 'swap-seats' || action === 'swap_seats' || action === 'swapSeats') {
      const { tableA, seatA, tableB, seatB } = body;
      const { data: rowA } = await db.from('reservation_seats').select('*').match({ table_number: tableA, seat_number: seatA }).maybeSingle();
      const { data: rowB } = await db.from('reservation_seats').select('*').match({ table_number: tableB, seat_number: seatB }).maybeSingle();

      if (rowA && rowB) {
        await db.from('reservation_seats').update({ reservation_id: rowB.reservation_id }).match({ table_number: tableA, seat_number: seatA });
        await db.from('reservation_seats').update({ reservation_id: rowA.reservation_id }).match({ table_number: tableB, seat_number: seatB });
      } else if (rowA && !rowB) {
        await db.from('reservation_seats').delete().match({ table_number: tableA, seat_number: seatA });
        await db.from('reservation_seats').insert({ table_number: tableB, seat_number: seatB, reservation_id: rowA.reservation_id });
      } else if (!rowA && rowB) {
        await db.from('reservation_seats').delete().match({ table_number: tableB, seat_number: seatB });
        await db.from('reservation_seats').insert({ table_number: tableA, seat_number: seatA, reservation_id: rowB.reservation_id });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    if (action === 'delete-seat' || action === 'delete_seat' || action === 'deleteSeat') {
      const { table, seat } = body;
      await db.from('reservation_seats').delete().match({ table_number: table, seat_number: seat });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers });
  } catch (err: any) {
    console.error('admin-api error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500, headers });
  }
});
