# Screenshot generator

Regenerates the images in `docs/assets` from the real app, using made-up demo data. It needs Node 22 or newer and a Chrome or Chromium binary. There are no packages to install and no accounts or keys are used.

1. Start the mock server (stands in for Supabase and the API): `node scripts/screenshots/mock-server.mjs`
2. In `frontend`, start the app against it:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:4010 NEXT_PUBLIC_SUPABASE_ANON_KEY=demo NEXT_PUBLIC_API_URL=http://localhost:4010 npx next dev -p 3100
   ```

3. Take the pictures: `FRONTEND_URL=http://localhost:3100 CHROME_PATH=/path/to/chrome node scripts/screenshots/capture.mjs docs/assets`
