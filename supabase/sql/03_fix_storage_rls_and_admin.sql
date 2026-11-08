-- ==============================================================================
-- 03_fix_storage_rls_and_admin.sql
-- Migration: Fix Supabase Storage RLS policies for payment-slips bucket & admin_users
-- RUN IN: Supabase Dashboard -> SQL Editor
-- SAFE: DOES NOT DELETE ANY EXISTING RESERVATIONS, SEATS, OR DATA
-- ==============================================================================

-- 1. Ensure 'payment-slips' storage bucket exists and is configured as private
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-slips',
  'payment-slips',
  false,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

-- 2. Storage RLS Policies: Allow anon & authenticated registrants to upload payment slips
drop policy if exists "Allow booking upload payment slips" on storage.objects;
create policy "Allow booking upload payment slips"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'payment-slips');

-- 3. Storage RLS Policies: Allow authenticated staff to view and generate signed URLs
drop policy if exists "Allow authenticated staff to read payment slips" on storage.objects;
create policy "Allow authenticated staff to read payment slips"
on storage.objects for select
to authenticated
using (bucket_id = 'payment-slips');

-- 4. Ensure admin_users table exists for staff authentication
create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text default 'staff',
  created_at timestamptz default now()
);

alter table public.admin_users enable row level security;

-- Allow service_role to manage admin_users
grant select, insert, update, delete on public.admin_users to service_role;

-- Allow authenticated users to check their own admin status
drop policy if exists "Allow users to read own admin role" on public.admin_users;
create policy "Allow users to read own admin role"
on public.admin_users for select
to authenticated
using (auth.uid() = id);

-- 5. Helper function for admin check
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.admin_users where id = auth.uid()
  );
$$;
