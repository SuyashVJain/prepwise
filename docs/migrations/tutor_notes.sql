-- Voice tutor session notes.
-- Review, then run once in the Supabase SQL editor for the prepwise project.
-- Until this is applied the app keeps notes in the browser for the session only.

create table if not exists public.tutor_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text,
  topic text,
  mode text check (mode in ('standalone', 'documents')),
  summary text not null default '',
  flashcards jsonb not null default '[]',
  created_at timestamp with time zone default timezone('utc', now())
);

create index if not exists tutor_notes_user_created_idx
  on public.tutor_notes (user_id, created_at desc);

alter table public.tutor_notes enable row level security;

-- Each student can read, add and delete only their own notes.
create policy "own tutor notes select" on public.tutor_notes
  for select using (auth.uid() = user_id);

create policy "own tutor notes insert" on public.tutor_notes
  for insert with check (auth.uid() = user_id);

create policy "own tutor notes delete" on public.tutor_notes
  for delete using (auth.uid() = user_id);
