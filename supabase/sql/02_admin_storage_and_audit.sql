-- ==============================================================================
-- 02_admin_storage_and_audit.sql
-- Run in Supabase SQL Editor to enable Private Storage, Real Deletion, and Audit Logs
-- Existing reservations and data are 100% PRESERVED.
-- ==============================================================================

-- 1. Create Private Storage Bucket for Payment Slips and Documents
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-slips',
  'payment-slips',
  false, -- STRICTLY PRIVATE: No public direct access
  10485760, -- 10MB limit
  array['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

-- 2. Storage Policies for 'payment-slips'
-- Allow public / anon users to upload files during registration
create policy "Allow booking upload payment slips"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'payment-slips');

-- Allow authenticated admins to view and download files
create policy "Allow authenticated admins to read payment slips"
on storage.objects for select
to authenticated
using (bucket_id = 'payment-slips');

-- 3. Audit Logs Table (Tracks all deletion and admin actions)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  admin_id text,
  admin_email text,
  target_id text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from anon, authenticated;
grant select, insert on public.audit_logs to service_role;

-- 4. Server-Side Atomic Deletion Function with Audit Logging
create or replace function public.delete_reservation_atomic(
  p_reservation_id text,
  p_admin_id text default 'system',
  p_admin_email text default 'admin@kku.ac.th'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp as $$
declare
  v_res record;
  v_deleted_count int;
begin
  -- 1. Find the target reservation
  select * into v_res from public.reservations where id = p_reservation_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'ไม่พบรหัสการจองนี้ในระบบ');
  end if;

  -- 2. Write Audit Log before deletion
  insert into public.audit_logs (
    action,
    admin_id,
    admin_email,
    target_id,
    details
  ) values (
    'DELETE_RESERVATION',
    p_admin_id,
    p_admin_email,
    p_reservation_id,
    jsonb_build_object(
      'main_booker', v_res.main_booker,
      'phone', v_res.phone,
      'guest_count', v_res.guest_count,
      'assignments', v_res.assignments,
      'total_amount', v_res.total_amount,
      'status', v_res.status,
      'deleted_at', now()
    )
  );

  -- 3. Delete seats first to ensure instant vacancy, then delete reservation
  delete from public.reservation_seats where reservation_id = p_reservation_id;
  delete from public.reservations where id = p_reservation_id;
  get diagnostics v_deleted_count = row_count;

  return jsonb_build_object(
    'success', true,
    'deleted_id', p_reservation_id,
    'freed_seats', v_res.guest_count,
    'message', 'ลบข้อมูลการจองและคืนที่นั่งเรียบร้อยแล้ว'
  );
end;
$$;

revoke all on function public.delete_reservation_atomic(text, text, text) from public, anon, authenticated;
grant execute on function public.delete_reservation_atomic(text, text, text) to service_role, authenticated;

-- 4.1 Client-Safe Atomic Deletion with Passcode Check
-- Enables direct database execution from the frontend even before Edge Function redeployment
create or replace function public.admin_delete_reservation(
  p_reservation_id text,
  p_passcode text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp as $$
begin
  if p_passcode is null or btrim(p_passcode) <> '2569' then
    return jsonb_build_object('success', false, 'error', 'รหัสผ่านเจ้าหน้าที่ไม่ถูกต้อง (Unauthorized)');
  end if;

  return public.delete_reservation_atomic(p_reservation_id, 'admin-console', 'admin@kku.ac.th');
end;
$$;

grant execute on function public.admin_delete_reservation(text, text) to anon, authenticated, service_role;

-- 5. Atomic Update for Reservation Status and Slip URL
create or replace function public.admin_update_reservation(
  p_reservation_id text,
  p_status text,
  p_rejection_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp as $$
begin
  update public.reservations
  set
    status = p_status,
    rejection_reason = p_rejection_reason
  where id = p_reservation_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'ไม่พบรหัสการจอง');
  end if;

  return jsonb_build_object('success', true, 'status', p_status);
end;
$$;

revoke all on function public.admin_update_reservation(text, text, text) from public, anon, authenticated;
grant execute on function public.admin_update_reservation(text, text, text) to service_role;
