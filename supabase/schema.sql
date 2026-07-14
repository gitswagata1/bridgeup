-- ============================================================
-- BridgeUp — campus deployment schema (Supabase / Postgres)
-- Paste this whole file into: Supabase Dashboard → SQL Editor → Run
--
-- Roles are assigned SERVER-SIDE from the email domain:
--   @vitstudent.ac.in → student · @vit.ac.in → faculty
--   ADMIN_EMAIL below → admin  (change it before running if needed)
-- ============================================================

-- ---------- profiles ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text unique not null,
  name       text not null,
  role       text not null default 'student' check (role in ('student','faculty','admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  admin_email constant text := 'theswagata1@gmail.com';   -- ADMIN_EMAIL: change if needed
  r text;
begin
  r := case
    when lower(new.email) = lower(admin_email)   then 'admin'
    when new.email ilike '%@vit.ac.in'           then 'faculty'
    when new.email ilike '%@vitstudent.ac.in'    then 'student'
    else 'student'
  end;
  insert into public.profiles (id, email, name, role)
  values (new.id, lower(new.email),
          coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)),
          r)
  on conflict (id) do nothing;
  insert into public.progress (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- convenience: caller's role (bypasses RLS safely)
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

-- ---------- progress (one jsonb blob per user — mirrors the app's shape) ----------
create table if not exists public.progress (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- faculty tests ----------
create table if not exists public.tests (
  id         uuid primary key default gen_random_uuid(),
  author     uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  ch         int  not null default 0,
  questions  jsonb not null,
  status     text not null default 'draft' check (status in ('draft','pending','approved','rejected')),
  approvals  jsonb not null default '[]'::jsonb,   -- array of reviewer emails
  rejections jsonb not null default '[]'::jsonb,   -- array of {email, reason}
  created_at timestamptz not null default now()
);

-- ---------- faculty materials ----------
create table if not exists public.materials (
  id         uuid primary key default gen_random_uuid(),
  ch         int  not null,
  kind       text not null check (kind in ('note','link')),
  title      text not null,
  content    text not null,
  author     uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------- test results (one attempt per student per test) ----------
create table if not exists public.test_results (
  test_id  uuid not null references public.tests(id) on delete cascade,
  user_id  uuid not null references public.profiles(id) on delete cascade,
  score    int  not null,
  total    int  not null,
  answers  jsonb,
  at       timestamptz not null default now(),
  primary key (test_id, user_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles     enable row level security;
alter table public.progress     enable row level security;
alter table public.tests        enable row level security;
alter table public.materials    enable row level security;
alter table public.test_results enable row level security;

-- profiles: any signed-in user can read (dashboards, review-panel counts);
-- all writes go through security-definer RPCs below.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated using (true);

-- progress: own row read/write; faculty & admin read the whole class
drop policy if exists progress_read on public.progress;
create policy progress_read on public.progress
  for select to authenticated
  using (user_id = auth.uid() or public.my_role() in ('faculty','admin'));
drop policy if exists progress_upsert on public.progress;
create policy progress_upsert on public.progress
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists progress_update on public.progress;
create policy progress_update on public.progress
  for update to authenticated using (user_id = auth.uid());

-- tests: students see only approved; faculty/admin see all;
-- authors manage their own; admins manage everything; votes via RPC.
drop policy if exists tests_read on public.tests;
create policy tests_read on public.tests
  for select to authenticated
  using (status = 'approved' or public.my_role() in ('faculty','admin'));
drop policy if exists tests_insert on public.tests;
create policy tests_insert on public.tests
  for insert to authenticated
  with check (public.my_role() = 'faculty' and author = auth.uid());
drop policy if exists tests_author_update on public.tests;
create policy tests_author_update on public.tests
  for update to authenticated
  using (author = auth.uid() or public.my_role() = 'admin');
drop policy if exists tests_delete on public.tests;
create policy tests_delete on public.tests
  for delete to authenticated
  using (author = auth.uid() or public.my_role() = 'admin');

-- materials
drop policy if exists materials_read on public.materials;
create policy materials_read on public.materials
  for select to authenticated using (true);
drop policy if exists materials_insert on public.materials;
create policy materials_insert on public.materials
  for insert to authenticated
  with check (public.my_role() = 'faculty' and author = auth.uid());
drop policy if exists materials_delete on public.materials;
create policy materials_delete on public.materials
  for delete to authenticated
  using (author = auth.uid() or public.my_role() = 'admin');

-- test_results: students write their own once (PK enforces one attempt);
-- students read their own, faculty/admin read all.
drop policy if exists results_insert on public.test_results;
create policy results_insert on public.test_results
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists results_read on public.test_results;
create policy results_read on public.test_results
  for select to authenticated
  using (user_id = auth.uid() or public.my_role() in ('faculty','admin'));

-- ============================================================
-- RPCs (security definer — server-side rules that clients can't bend)
-- ============================================================

-- Review panel: up to 5 faculty decide, majority (3) publishes.
-- Small pilots scale the threshold down to the number of other faculty.
create or replace function public.vote_test(p_test uuid, p_approve boolean, p_reason text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  t record; me record; needed int;
begin
  select * into me from profiles where id = auth.uid();
  if me.role <> 'faculty' then raise exception 'Only faculty can vote'; end if;
  select * into t from tests where id = p_test for update;
  if t is null then raise exception 'Test not found'; end if;
  if t.author = auth.uid() then raise exception 'Authors cannot vote on their own test'; end if;
  if t.status <> 'pending' then raise exception 'This test is not in review'; end if;
  if t.approvals ? me.email or exists (
       select 1 from jsonb_array_elements(t.rejections) r where r->>'email' = me.email
  ) then raise exception 'You have already voted on this test'; end if;

  if p_approve then
    update tests set approvals = approvals || to_jsonb(me.email) where id = p_test;
  else
    update tests set rejections = rejections || jsonb_build_array(jsonb_build_object('email', me.email, 'reason', coalesce(p_reason,''))) where id = p_test;
  end if;

  select least(3, greatest(1, count(*)::int)) into needed
    from profiles where role = 'faculty' and id <> t.author;

  update tests set status = case
      when jsonb_array_length(approvals)  >= needed then 'approved'
      when jsonb_array_length(rejections) >= needed then 'rejected'
      else status end
  where id = p_test;
end $$;

-- Admin: change a non-admin user's role
create or replace function public.set_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() <> 'admin' then raise exception 'Admin only'; end if;
  if p_role not in ('student','faculty') then raise exception 'Invalid role'; end if;
  update profiles set role = p_role where id = p_user and role <> 'admin';
end $$;

-- Admin: reset a user's course progress
create or replace function public.admin_reset_progress(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() <> 'admin' then raise exception 'Admin only'; end if;
  update progress set data = '{}'::jsonb, updated_at = now() where user_id = p_user;
  delete from test_results where user_id = p_user;
end $$;

-- Admin: remove a user from the platform (profile + data; auth entry stays inert)
create or replace function public.admin_delete_user(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() <> 'admin' then raise exception 'Admin only'; end if;
  delete from profiles where id = p_user and role <> 'admin';
end $$;

grant execute on function public.vote_test(uuid, boolean, text) to authenticated;
grant execute on function public.set_role(uuid, text) to authenticated;
grant execute on function public.admin_reset_progress(uuid) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
