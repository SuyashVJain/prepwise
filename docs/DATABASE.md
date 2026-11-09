# Database

Prepwise stores its data in Supabase Postgres. The web app reads and writes it directly with the signed-in student's session, and row level security makes sure each student only sees their own rows. The API does not touch the database.

## Tables

### `profiles`
One row per account, created by a trigger when a user signs up.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key, references `auth.users`, deleted with the user |
| `full_name` | text | |
| `university` | text | |
| `semester` | int | |
| `target_role` | text | |
| `onboarding_complete` | boolean | default false; the route guard sends new users to onboarding |
| `created_at` | timestamptz | |

### `syllabi`
The syllabus a student uploaded or typed in, with its retrieval chunks and vectors.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `user_id` | uuid | references `profiles` |
| `name`, `university`, `semester`, `source` | text, text, int, text | `source` is `pdf` or `manual` |
| `topics` | jsonb | list of topic names |
| `raw_chunks` | jsonb | list of text chunks |
| `vectors` | jsonb | per-chunk metadata including the embedding, so the index can be rebuilt without re-embedding |
| `created_at` | timestamptz | |

### `sessions`
One row per finished interview.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `user_id` | uuid | references `profiles` |
| `syllabus_id` | uuid | references `syllabi` |
| `interview_type`, `target_company` | text | |
| `total_questions` | int | the number actually answered |
| `score_avg` | numeric(4,2) | |
| `weak_topics` | jsonb | list of weak areas |
| `completed` | boolean | |
| `created_at` | timestamptz | |

### `questions`
One row per answered question, deleted with its session.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `session_id` | uuid | references `sessions` |
| `question_text`, `user_answer`, `hint`, `ideal_answer` | text | |
| `score` | numeric(4,2) | |
| `claims` | jsonb | the checked claims; added by `question_extras.sql` |
| `is_follow_up` | boolean | added by `question_extras.sql` |
| `time_taken_seconds` | int | added by `question_extras.sql` |
| `created_at` | timestamptz | |

### `tutor_notes`
Summaries and flashcards saved from voice tutor sessions. Created by `tutor_notes.sql`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `user_id` | uuid | references `profiles` |
| `subject`, `topic` | text | |
| `mode` | text | `standalone` or `documents` |
| `summary` | text | |
| `flashcards` | jsonb | |
| `created_at` | timestamptz | indexed with `user_id` |

## Row level security

Row level security is on for every table.

| Table | Policy | Rule |
|---|---|---|
| `profiles` | own profile (all actions) | `auth.uid() = id` |
| `syllabi` | own syllabi (all actions) | `auth.uid() = user_id` |
| `sessions` | own sessions (all actions) | `auth.uid() = user_id` |
| `questions` | own questions (all actions) | the row's session belongs to `auth.uid()` |
| `tutor_notes` | select, insert, delete | `auth.uid() = user_id` |

The Settings page deletes a student's own rows in `questions`, `sessions` and `tutor_notes`, and this works only because of these policies.

## Migrations

The base tables above are created once, in this order, in the Supabase SQL editor (the statements are in `docs/migrations/base_schema.sql`). Then apply the files in `docs/migrations/`:

1. `base_schema.sql` creates `profiles`, `syllabi`, `sessions`, `questions`, the policies and the new-user trigger.
2. `tutor_notes.sql` adds the voice tutor notes table and its policies.
3. `question_extras.sql` adds `claims`, `is_follow_up` and `time_taken_seconds` to `questions`. Until it is applied the app saves sessions without those fields and keeps working.

Each file is additive and safe to read before running. `tutor_notes.sql` creates policies and should be run only once.
