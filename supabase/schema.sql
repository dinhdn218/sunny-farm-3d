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
