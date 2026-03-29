<div align="center">

<br />

<img src="./frontend/public/screenshots/landing.png" alt="Prepwise" width="100%" />

<br />
<br />

<a href="https://prepwise-mocha.vercel.app"><img src="https://img.shields.io/badge/FRONTEND-prepwise--mocha.vercel.app-d4fe42?style=for-the-badge&labelColor=0e0e0e&color=d4fe42" /></a>
&nbsp;
<a href="https://prepwise-production-eb53.up.railway.app"><img src="https://img.shields.io/badge/API-railway.app-d4fe42?style=for-the-badge&labelColor=0e0e0e&color=d4fe42" /></a>
&nbsp;
<img src="https://img.shields.io/badge/NEXT.JS_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
&nbsp;
<img src="https://img.shields.io/badge/FASTAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
&nbsp;
<img src="https://img.shields.io/badge/SUPABASE-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
&nbsp;
<img src="https://img.shields.io/badge/LICENSE-MIT-d4fe42?style=for-the-badge&labelColor=0e0e0e" />

<br />
<br />

</div>

---

# Every other prep tool is lying to you.

They give you the same 500 questions every CS student in India has already memorized. They don't know you studied **Data Warehousing** in Semester 4, not just DSA. They don't know your university. They don't care.

**Prepwise does.**

Upload your syllabus PDF. Aria — the AI interview coach — reads it, indexes it, and grills you on what *you actually studied*. Not a question bank. Not a template. Your curriculum, turned into a live interview.

> Built by a CS student who got tired of prepping with tools that weren't built for him.

---

## What it looks like

<table>
<tr>
<td width="50%">

**Onboarding — Upload your syllabus**
![Onboarding](./frontend/public/screenshots/onboarding.png)
PDF parsed. Topics extracted. Vector store built.

</td>
<td width="50%">

**Dashboard — Your performance over time**
![Dashboard](./frontend/public/screenshots/dashboard.png)
Real session data. Weak topics surfaced automatically.

</td>
</tr>
<tr>
<td width="50%">

**Interview Room — Aria asks, you answer**
![Interview](./frontend/public/screenshots/interview.png)
Voice or text. RAG-grounded questions. Scored live.

</td>
<td width="50%">

**Study Mode — Chat with your documents**
![Study](./frontend/public/screenshots/study1.png)
Upload any PDF. Ask anything. Every answer cites its source.

</td>
</tr>
</table>

<div align="center">

**Study Mode — One-click MCQ quiz from your notes**

<img src="./frontend/public/screenshots/study2.png" width="80%" />

</div>

---

## The RAG pipeline (the part that actually matters)

Most "AI interview tools" wrap GPT-4 with a system prompt. This is not that.

```
PDF upload
   │
   ├─ PyMuPDF extracts raw text page by page
   │
   ├─ Split into 400-word overlapping chunks
   │
   ├─ all-MiniLM-L6-v2 embeds each chunk → 384-dim vector
   │
   └─ Chunks + vectors stored in Supabase as JSONB
            │
            └─ On session start: FAISS IndexFlatL2 rebuilt in memory
                     │
                     └─ Per question: semantic query → top-k chunks retrieved
                              │
                              └─ Chunks injected into Groq prompt
                                       │
                                       └─ Llama 3.3 70B generates a question
                                          grounded in YOUR syllabus content
```

**Why JSONB + in-memory FAISS instead of pgvector?**
No extra Postgres extension needed. No re-embedding on every session load. Vectors are stored once, FAISS index is rebuilt in ~50ms per session from stored floats. Works on free-tier Supabase, deploys to Railway without configuration.

---

## Two products in one

### 🎙 Interview Mode

Aria runs a structured mock interview calibrated to your syllabus and target company.

| | |
|---|---|
| Interview types | Technical · HR/Behavioural · System Design · Subject-specific |
| Company targets | FAANG · Product Startups · Service Companies · Core Campus |
| Answer input | Voice (Web Speech API) + Text |
| Per answer | Score 0–10 · Contextual hint · Ideal answer reveal |
| End of session | Full debrief · Weak topic breakdown · Everything saved to Supabase |

### 📚 Study Mode

Not just interview prep. Upload your lecture notes, units, or any PDF — and study with Aria the way you'd study with a friend who actually read everything.

| | |
|---|---|
| Multi-file upload | Load multiple PDFs simultaneously — chat across all of them |
| Document chat | Multi-turn conversation · every answer cites its source document |
| MCQ generator | One click → quiz generated from your uploaded content |
| Grounded answers | Responses tied to your documents, not GPT's general knowledge |

---

## Stack

| Layer | Tech | Notes |
|---|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind v4 | App Router, `proxy.ts` for auth + onboarding gate |
| Backend | FastAPI, Python 3.11 | Deployed on Railway |
| LLM | Groq — Llama 3.3 70B | Fastest open-source inference, free tier |
| Embeddings | sentence-transformers `all-MiniLM-L6-v2` | Local, no API cost |
| Vector search | FAISS IndexFlatL2 | In-memory, rebuilt per session from Supabase |
| PDF parsing | PyMuPDF | Reliable across messy university syllabus formats |
| Database + Auth | Supabase | PostgreSQL + RLS + Auth in one |
| Frontend deploy | Vercel | [prepwise-mocha.vercel.app](https://prepwise-mocha.vercel.app) |
| Backend deploy | Railway | [prepwise-production-eb53.up.railway.app](https://prepwise-production-eb53.up.railway.app) |

---

## Project structure

```
prepwise/
├── frontend/
│   ├── app/
│   │   ├── (auth)/login · signup
│   │   ├── (dashboard)/dashboard    ← stats, history, weak topics, syllabi
│   │   ├── onboarding/              ← 3-step wizard
│   │   ├── interview/[sessionId]/   ← live interview room
│   │   └── study/                  ← document chat + MCQ
│   ├── proxy.ts                     ← auth guard + onboarding redirect
│   └── lib/supabase/
│
└── backend/
    └── app/
        ├── routers/
        │   ├── interview.py   ← Q&A, scoring, debrief
        │   ├── session.py     ← session lifecycle
        │   ├── syllabus.py    ← upload, chunk, embed, store
        │   └── study.py       ← multi-file chat, MCQ generation
        └── services/
            ├── rag.py         ← FAISS + retrieval
            ├── gemini.py      ← Groq LLM calls
            └── scorer.py      ← answer evaluation
```

---

## Run it locally

### Prerequisites
- Node.js 18+ · Python 3.11 · A free [Supabase](https://supabase.com) project · A free [Groq](https://console.groq.com) key

### 1 — Supabase SQL setup

<details>
<summary>Click to expand</summary>

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

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own syllabi" on syllabi for all using (auth.uid() = user_id);
create policy "own sessions" on sessions for all using (auth.uid() = user_id);
create policy "own questions" on questions for all using (
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

</details>

### 2 — Backend

```bash
cd backend
python -m venv venv && venv\Scripts\activate  # Windows
# source venv/bin/activate                    # Mac/Linux
pip install -r requirements.txt
```

`backend/.env`:
```env
GROQ_API_KEY=...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=...
FRONTEND_URL=http://localhost:3000
```

```bash
uvicorn app.main:app --reload --port 8000
```

### 3 — Frontend

```bash
cd frontend && npm install
```

`frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm run dev
# → localhost:3000
```

Sign up → onboarding auto-triggers → upload your syllabus → start an interview.

---

## Roadmap

- [ ] Google OAuth
- [ ] Resume upload + resume-aware questions
- [ ] Session debrief export as PDF
- [ ] College-specific syllabus presets
- [ ] Peer challenge mode

---

## License

MIT. Fork it, build on it, deploy your own.

---

<div align="center">
<br />

Built by **[Suyash Vasal Jain](https://github.com/SuyashVJain)**

CS student · SUAS Indore

<br />

*If this helped you — drop a ⭐*

</div>