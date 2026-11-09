-- Base schema for Prepwise: tables, row level security and the new-user trigger.
-- Run once in the Supabase SQL editor before the other files in this folder.

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text, university text, semester int, target_role text,
  onboarding_complete boolean default false,
  created_at timestamp with time zone default timezone('utc', now())
);

create table syllabi (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  name text not null, university text, semester int,
  topics jsonb default '[]',
  raw_chunks jsonb default '[]',
  vectors jsonb default '[]',
  source text,
  created_at timestamp with time zone default timezone('utc', now())
);

create table sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  syllabus_id uuid references syllabi(id),
  interview_type text, target_company text, total_questions int,
  score_avg numeric(4,2), weak_topics jsonb default '[]',
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc', now())
);

create table questions (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references sessions(id) on delete cascade,
  question_text text not null, user_answer text,
  score numeric(4,2), hint text, ideal_answer text,
  created_at timestamp with time zone default timezone('utc', now())
);

alter table profiles enable row level security;
alter table syllabi enable row level security;
alter table sessions enable row level security;
alter table questions enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own syllabi" on syllabi for all using (auth.uid() = user_id);
create policy "own sessions" on sessions for all using (auth.uid() = user_id);
create policy "own questions" on questions for all using (
  auth.uid() = (select user_id from sessions where id = session_id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
