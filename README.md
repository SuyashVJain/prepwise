# Prepwise - Prep smarter. Not generic.

**Prepwise** is an AI-powered mock interview platform built for Indian CS students. Unlike generic interview prep tools, Prepwise grounds every question in your actual university syllabus using a real RAG (Retrieval-Augmented Generation) pipeline - not hardcoded question banks.

🔗 **Live:** [prepwise-mocha.vercel.app](https://prepwise-mocha.vercel.app)

---

## What it does

You upload your syllabus PDF. Prepwise parses it, chunks it, embeds it into a FAISS vector store, and uses it to generate interview questions that are semantically grounded in what you actually study. After each session, you get a score per answer, an ideal answer, a debrief from Aria (the AI coach), and a running analysis of your weak topics over time.

**Key features:**
- Syllabus-aware question generation via PDF upload + RAG pipeline
- 4 interview modes: Technical, HR/Behavioural, System Design, Subject-specific
- 4 company style targets: FAANG, Product Startups, Service Companies, Core Campus
- Voice + text answer input
- Real-time scoring (0–10) with hints and ideal answers
- Session debrief with weak topic analysis
- Study Mode: upload any document and chat with Aria or generate an MCQ quiz from it
- Dashboard with session history, performance chart, and weak topic tracking

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11 |
| AI | Groq API (Llama 3.3 70B) |
| RAG | sentence-transformers (all-MiniLM-L6-v2) + FAISS |
| PDF Parsing | PyMuPDF |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email) |
| Deployment | Vercel (frontend) + Railway (backend) |

---

## How the RAG pipeline works

1. User uploads syllabus PDF during onboarding
2. PyMuPDF extracts text page by page
3. Text is split into overlapping 400-word chunks
4. Each chunk is embedded using `all-MiniLM-L6-v2` (384-dim vectors)
5. Chunks and metadata are stored in Supabase
6. When an interview session starts, chunks are loaded from Supabase
7. FAISS index is rebuilt in memory from stored chunks (no re-embedding)
8. For each question, a semantic query retrieves the top-k relevant chunks
9. Retrieved chunks are injected into the Groq prompt as context
10. Groq generates a question grounded in the actual syllabus content

---

## Project Structure

```
prepwise/
├── frontend/                  # Next.js 14 app
│   ├── app/
│   │   ├── (auth)/            # Login, Signup
│   │   ├── (dashboard)/       # Dashboard with sidebar nav
│   │   ├── onboarding/        # 3-step onboarding wizard
│   │   ├── interview/         # Interview room
│   │   └── study/             # Study Mode (chat + quiz)
│   ├── components/
│   │   ├── Logo.tsx
│   │   └── LoadingScreen.tsx
│   └── lib/supabase/
│
└── backend/                   # FastAPI app
    └── app/
        ├── routers/
        │   ├── interview.py   # Session management
        │   ├── syllabus.py    # PDF upload + embedding
        │   └── study.py       # Study mode chat + quiz
        └── services/
            ├── rag.py         # FAISS + sentence-transformers
            ├── gemini.py      # Groq LLM calls
            └── scorer.py      # Answer evaluation
```

---

## Running locally

### Prerequisites
- Node.js 18+
- Python 3.11
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key (free)

### Supabase setup

Run this SQL in your Supabase SQL Editor:

```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  university text,
  semester int,
  target_role text,
  onboarding_complete boolean default false,
  created_at timestamp with time zone default timezone('utc', now())
);

create table syllabi (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  university text,
  semester int,
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
  interview_type text,
  target_company text,
  total_questions int,
  score_avg numeric(4,2),
  weak_topics jsonb default '[]',
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc', now())
);

create table questions (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references sessions(id) on delete cascade,
  question_text text not null,
  user_answer text,
  score numeric(4,2),
  hint text,
  ideal_answer text,
  created_at timestamp with time zone default timezone('utc', now())
);

alter table profiles enable row level security;
alter table syllabi enable row level security;
alter table sessions enable row level security;
alter table questions enable row level security;

create policy "Users manage own profile" on profiles for all using (auth.uid() = id);
create policy "Users manage own syllabi" on syllabi for all using (auth.uid() = user_id);
create policy "Users manage own sessions" on sessions for all using (auth.uid() = user_id);
create policy "Users manage own questions" on questions for all using (
  auth.uid() = (select user_id from sessions where id = session_id)
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
```

Create `backend/.env`:
```
GROQ_API_KEY=your_groq_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
FRONTEND_URL=http://localhost:3000
```

```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000).

---

## Design

Prepwise uses an editorial brutalism design system - dark `#0e0e0e` background, electric lime `#d4fe42` accent, Space Grotesk + JetBrains Mono typefaces, no rounded corners, no gradients. The AI persona is named **Aria**.

---

## License

MIT