-- Extra per-question fields for the interview.
-- Review, then run once in the Supabase SQL editor for the prepwise project.
-- Until this is applied the app saves sessions without these fields and keeps working.

alter table public.questions add column if not exists claims jsonb;
alter table public.questions add column if not exists is_follow_up boolean not null default false;
alter table public.questions add column if not exists time_taken_seconds int;
