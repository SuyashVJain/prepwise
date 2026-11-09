# Contributing to Prepwise

Thanks for your interest. Bug reports, fixes, documentation and ideas are all welcome.

## Before you start

- Look through the [open issues](https://github.com/SuyashVJain/prepwise/issues) and [docs/ROADMAP.md](docs/ROADMAP.md).
- For anything bigger than a small fix, open an issue first so we can agree on the approach.
- Be kind. This project follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## Set up

Follow the Quick start in the [README](README.md). You need Node.js 20 or newer, Python 3.11, a Supabase project and a Groq key to run the whole app. The tests need none of these.

## Branches and commits

- Branch from `main` and name the branch for the change: `fix/score-cap`, `feat/history-filter`, `docs/api-examples`.
- Write commits as one plain line in the present tense that says what changed, for example `Add history filters and trend`. One logical change per commit.
- Keep pull requests focused. Fill in the pull request template.

## Tests and checks

Run these before you open a pull request. They are the same checks CI runs.

```bash
# backend, with the virtual environment active
cd backend
python -m unittest discover -s tests -t .
python -m tests.score_comparison --offline

# frontend
cd ../frontend
npm run lint
npx tsc --noEmit
npm run build
```

New behaviour should come with a test. Backend tests must work offline: use the fake model replies already used in `backend/tests` instead of calling a real provider.

## Code style

- Python: type hints on public functions, small modules, a short docstring that says what a function does. Match the surrounding code.
- TypeScript: strict types, no `any` without a reason, no unused code. The frontend styles components with inline style objects and the colour and spacing tokens in `app/globals.css`; follow that pattern instead of mixing in another one.
- Accessibility is part of the job: labels on controls, visible focus, enough contrast, keyboard use.
- Do not commit secrets, `.env` files, personal data or large binaries. Use the `.env.example` files for new settings.

## Database changes

Add a new SQL file to `docs/migrations`, keep it additive, and describe it in [docs/DATABASE.md](docs/DATABASE.md). The app should keep working until the file is applied.

## Reporting security problems

Do not open a public issue. See [SECURITY.md](SECURITY.md).
