-- Run in Supabase SQL Editor after reviewing. Existing reservations are preserved.
-- Do not expose reservation records, phone numbers, or slips through anon table SELECT.
create table if not exists public.reservations (
  id text primary key,
  main_booker text not null,
  phone text,
  email text,
  category text,
  academic_year text,
  guest_count integer default 0,
  guests jsonb default '[]'::jsonb,
  assignments jsonb default '{}'::jsonb,
  total_amount numeric(12,2) default 0,
  slip_file_name text,
  slip_url text,
  slip_timestamp text,
  status text default 'pending',
  created_at timestamptz default now()
);
create table if not exists public.reservation_seats (
  table_number integer not null,
  seat_number integer not null,
  reservation_id text not null references public.reservations(id) on delete cascade,
  primary key (table_number, seat_number)
);
alter table public.reservations enable row level security;
alter table public.reservation_seats enable row level security;
revoke all on public.reservations from anon, authenticated;
revoke all on public.reservation_seats from anon, authenticated;

-- Only the Edge Function service-role may call this routine.
create or replace function public.create_reservation_atomic(payload jsonb)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  rid text; nm text; gs jsonb; ass jsonb; cnt int; i int; t int; s int;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then raise exception 'invalid payload' using errcode = '22023'; end if;
  rid := payload->>'id'; nm := btrim(coalesce(payload->>'mainBooker', ''));
  gs := payload->'guests'; ass := payload->'assignments';
  if rid is null or length(rid) < 10 or length(rid) > 100 or nm = '' or length(nm) > 200
    or jsonb_typeof(gs) <> 'array' or jsonb_typeof(ass) <> 'object'
    then raise exception 'invalid booking' using errcode = '22023'; end if;
  cnt := jsonb_array_length(gs);
  if cnt < 1 or cnt > 8 or (payload->>'guestCount')::integer <> cnt
    or (select count(*) from jsonb_object_keys(ass)) <> cnt
    then raise exception 'invalid guest count' using errcode = '22023'; end if;
  for i in 0..cnt-1 loop
    if length(btrim(coalesce(gs->i->>'name', ''))) < 1 or length(gs->i->>'name') > 200
      then raise exception 'invalid guest name' using errcode = '22023'; end if;
    if ass->(i::text) is null then raise exception 'missing seat' using errcode = '22023'; end if;
  end loop;
  insert into public.reservations (id,main_booker,phone,email,category,academic_year,guest_count,guests,assignments,total_amount,slip_file_name,slip_timestamp,status)
  values (rid,nm,left(payload->>'phone',40),left(payload->>'email',250),left(payload->>'category',30),left(payload->>'academicYear',50),cnt,gs,ass,cnt*799,left(payload->>'slipFileName',250),left(payload->>'slipTimestamp',100),'pending');
  for i in 0..cnt-1 loop
    t := (ass->(i::text)->>'table')::integer;
    s := (ass->(i::text)->>'seat')::integer;
    if t not between 1 and 15 or s not between 1 and 8 then
      raise exception 'invalid seat' using errcode = '22023'; end if;
    insert into public.reservation_seats(table_number,seat_number,reservation_id) values (t,s,rid);
  end loop;
  return rid;
end $$;
revoke all on function public.create_reservation_atomic(jsonb) from public, anon, authenticated;
grant execute on function public.create_reservation_atomic(jsonb) to service_role;

-- Only public seat status, category and first name are exposed; no contact details or ticket codes.
create or replace function public.list_public_seats()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object(
   'table', rs.table_number,
   'seat', rs.seat_number,
   'guestName', split_part(btrim(regexp_replace(coalesce(r.guests->(x.idx::int)->>'name','จองแล้ว'), '^(นาย|นางสาว|นาง|ดร\\.|ผศ\\.|รศ\\.|ศ\\.)', '')), ' ', 1),
   'category', case when r.guests->(x.idx::int)->>'category' in ('graduate','faculty','guest') then r.guests->(x.idx::int)->>'category' else 'guest' end,
   'checkedIn', false
  ) order by rs.table_number,rs.seat_number), '[]'::jsonb)
 from public.reservation_seats rs
 join public.reservations r on r.id = rs.reservation_id
 left join lateral (
   select key as idx from jsonb_each(r.assignments) a(key,value)
   where (a.value->>'table')::int = rs.table_number and (a.value->>'seat')::int = rs.seat_number
   limit 1
 ) x on true;
$$;
revoke all on function public.list_public_seats() from public, anon, authenticated;
grant execute on function public.list_public_seats() to service_role;
