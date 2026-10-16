create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  gold integer default 350,
  gems integer default 45,
  day integer default 1,
  game_state jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using ( true );

create policy "Users can insert their own profile"
  on public.profiles for insert with check ( auth.uid() = id );

create policy "Users can update own profile"
  on public.profiles for update using ( auth.uid() = id );

-- Neighbours visiting each other's farms (Thăm Hàng Xóm): a visit leaves a watering or a like, which the
-- farm's owner collects as a letter. Visitors sign visits with their own account and today's date (Vietnam),
-- one of each kind per farm a day; nobody can edit or delete a visit; owners read the visits to their farm.
-- Safe to run again: it only adds what is missing.
create table if not exists public.farm_visits (
  id bigint generated always as identity primary key,
  host_id uuid not null references public.profiles (id) on delete cascade,
  visitor_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  visitor_name text not null check (char_length(visitor_name) between 1 and 40),
  kind text not null check (kind in ('like', 'water')),
  visit_date date not null default ((now() at time zone 'Asia/Ho_Chi_Minh')::date),
  created_at timestamp with time zone not null default now(),
  unique (host_id, visitor_id, kind, visit_date)
);

create index if not exists farm_visits_host_id_id on public.farm_visits (host_id, id);

alter table public.farm_visits enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'farm_visits' and policyname = 'Visitors sign their own visits, dated today'
  ) then
    create policy "Visitors sign their own visits, dated today"
      on public.farm_visits for insert
      with check (
        auth.uid() = visitor_id
        and visitor_id <> host_id
        and visit_date = (now() at time zone 'Asia/Ho_Chi_Minh')::date
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'farm_visits' and policyname = 'Owners and visitors read their visits'
  ) then
    create policy "Owners and visitors read their visits"
      on public.farm_visits for select
      using (auth.uid() = host_id or auth.uid() = visitor_id);
  end if;
end $$;
