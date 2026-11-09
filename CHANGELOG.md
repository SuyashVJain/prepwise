# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-11-09

First tagged release.

### Added
- Interview mode with syllabus-grounded questions, four interview types and four company styles
- Claim-by-claim answer checking with confidence, critical errors and score caps in code, shown as a claims list after each answer
- Adaptive follow-up questions, live pacing with time per answer, ending a session early saves only answered questions
- History with filters and full replay, progress page, weak topic trends, dashboard next-step suggestion
- Debrief with score ring, assessment cards, topic chart, practice links and PDF export
- Voice tutor: local speech models with cloud fallback, interruption, doubt mode, Hinglish mode, notes and flashcards, roadmaps, visual walkthroughs, video suggestions, Python code-along, hand-off to a mock interview
- Study mode: chat with several documents with citations, and quiz generation
- Public landing page, welcome guide, setup instructions, microphone help
- Email and optional Google sign-in, password reset, clearer sign-in errors, delete-my-data, privacy and terms pages
- Backend authentication, per-user rate limits, health route, multi-origin CORS
- Settings with saved session defaults, toasts, 404 and error pages, route titles, icon, manifest, sitemap
- Documentation, continuous integration, issue and pull request templates

### Changed
- Scoring uses fixed score bands as anchors; only confident critical errors cap a score
- The claim check treats the question hint as a rough guide instead of the truth
- One shared sidebar on every signed-in page, and a responsive layout down to phone width
- Higher text contrast, larger labels, visible focus and hover states

### Fixed
- Wrongly marked critical errors on correct answers
- Wrong question count saved when a session ended early
- Lint backlog cleared
- Syllabus embeddings are stored and reused instead of being recomputed on every request

## Earlier work

- 2026-03: first full-stack version (Next.js, FastAPI, Supabase, FAISS retrieval, Groq), deployed to Vercel and Railway
- 2026-10: backend authentication, rate limiting, persisted embeddings, dependency updates, verify-then-score chain and the voice tutor
