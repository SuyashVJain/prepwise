# Deploying Prepwise

The backend (FastAPI) and the frontend (Next.js) are deployed separately. Supabase holds auth and data. Do the steps in this order: Supabase, backend, frontend, then come back to Supabase to add the final URLs.

## 1. Supabase (first pass)

1. Create or open the project. Run the SQL in `docs/migrations/` once each, in the SQL editor and in this order: `base_schema.sql`, `tutor_notes.sql`, `question_extras.sql`. See [DATABASE.md](DATABASE.md).
2. In Project settings, copy the project URL and the anon (publishable) key. You will need both for the frontend. The backend needs the project URL, and the JWT secret only if the project still uses the legacy shared secret.

## 2. Backend on Render

The backend fits Render's free Web Service (512 MB). Embeddings run through fastembed (ONNX), which keeps memory at about 270 MB, and speech uses cloud providers.

- **Service type:** Web Service
- **Root directory:** `backend`
- **Runtime:** Python 3.11 (set the environment variable `PYTHON_VERSION` to `3.11.9` if Render picks another version)
- **Build command:** `pip install -r requirements.txt`
- **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Health check path:** `/health`
- **Install note:** the speech models in `requirements-voice.txt` are optional and too heavy for a small instance, so leave them out. Without them the voice tutor uses the cloud speech providers automatically.

Railway also works as an alternative: the same root directory, start command and health check apply, and they are already set in `Procfile` and `railway.json`.

### Keep the free instance awake

A free Render service sleeps after about 15 minutes without traffic, and the next request waits for it to wake. To avoid that, create a free [UptimeRobot](https://uptimerobot.com) monitor of type HTTP(s) that requests `https://<your-service>.onrender.com/health` every 5 minutes.

Environment variables (names only, set the values in the Render dashboard):

| Name | Purpose |
|---|---|
| `GROQ_API_KEY` | Key for the language model provider. Required for questions, scoring and the tutor. |
| `SUPABASE_URL` | Project URL, used to verify sign-in tokens. |
| `SUPABASE_JWT_SECRET` | Only for projects on the legacy shared secret. |
| `FRONTEND_URL` | Allowed browser origins, comma separated, for example the production domain and a preview domain. No trailing slash needed. |
| `VOICE_WARMUP` | Set to `0` on a small instance so no speech models load at start. |
| `VOICE_STT_PROVIDER` | `cloud` (speech to text). |
| `VOICE_TTS_PROVIDER` | `cloud` (text to speech). |
| `LLM_MODEL` | Optional. Overrides the default model. |
| `LLM_REASONING_EFFORT` | Optional. `low` by default, `none` to leave it out. |
| `RATE_LIMIT_LLM`, `RATE_LIMIT_UPLOAD`, `RATE_LIMIT_DEFAULT`, `RATE_LIMIT_TUTOR` | Optional per-user limits such as `30/minute`. |
| `YOUTUBE_API_KEY` | Optional. Enables video suggestions in the tutor. |
| `VOICE_STT_CLOUD_MODEL`, `VOICE_TTS_CLOUD_VOICE` | Optional. Cloud speech model and voice. |

After deploying, open `https://<your-service>.onrender.com/health`. It should return `{"status":"ok"}`.

## 3. Frontend on Vercel

- **Root directory:** `frontend`
- **Framework preset:** Next.js
- **Build command:** `npm run build`
- **Install command:** `npm install`
- **Output:** default

Environment variables:

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL, for example `https://<your-service>.onrender.com`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (publishable) key. |
| `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH` | Set to `true` only after the Google provider is enabled (step 4). Takes effect on the next build. |

## 4. Supabase (second pass)

1. **Authentication, URL configuration:** set the Site URL to the production frontend URL. Add redirect URLs for `https://<production-domain>/auth/callback`, the same path on any preview domain, and `http://localhost:3000/auth/callback` for local work.
2. **Authentication, Providers, Google:** create an OAuth client in the Google Cloud console, paste its client ID and secret into the provider, and add the callback URL shown by Supabase as an authorised redirect in Google. Enable the provider, then set `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true` on Vercel and redeploy.
3. **Authentication, Email:** keep email confirmation on if you want confirmed accounts. Password reset links use the same redirect URLs as above.

## 5. Check

- The backend `/health` returns ok.
- Sign up, finish onboarding, run a short session, open History and export the debrief.
- If the browser reports a CORS error, the origin is missing from `FRONTEND_URL`.
