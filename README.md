# Ekilib

Balans lavi ak travay an Kreyòl — yon konpayon vwa-an-premye pou antreprenè ayisyen.

Ekilib is a voice-first life-balance app for Haitian builders. You speak or type in Kreyòl, confirm the log, and see the day against four daily hour goals: **Travay / Lavi / Sante / Dòmi** (Work / Life / Health / Sleep). A constrained adviser can suggest a log, but nothing is saved until you confirm. It is inspired by the idea of a balance tracker, and it is its own product: the primary path is a Kreyòl phrase, not a spreadsheet grid.

## Kòmanse / Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run dev` creates the local SQLite file, seeds the demo account when needed, and starts Next.js.

Kont demo / demo account:

- Email: `demo@ekilib.app`
- Password: `ekilib-demo`

```bash
npm test
npm run build
npm start
```

## Sa w ka fè / What you can do

- Land on a Kreyòl page, switch to French or English, and try the demo.
- Create an account. New accounts get the four daily goals and five starter habits.
- Log by voice or text: `Mwen travay 3 èdtan`, `Mwen fè espò`. Confirm category and hours. A manual form stays underneath.
- Check habits, leave a 1–5 check-in, and read a balance score plus a plain-language insight.
- Talk to **Konseye Ekilib**. It stays in Kreyòl unless you ask for French or English, encourages balance, and refuses medical or therapy diagnosis. Proposed logs wait for confirmation.
- Connect Google Calendar when OAuth keys exist. Import Apple, Outlook, or any other calendar with an HTTPS ICS link or a pasted ICS file. Events show on the day; you confirm before they become logs.
- Hear replies when ElevenLabs is configured. Without a key or voice id, the app stays text-only and settings explain what to add.
- If the network drops, confirmed logs wait in the browser and send when you are back. Live AI and voice need a connection. The UI says so.

Free includes logging, goals, habits, demo advice, and 80 logs a month. Pro is an $8/month stub: AI adviser, ElevenLabs, calendar sync, and no monthly cap. The upgrade button does not charge a card.

## Anviwònman / Environment

Copy `.env.example` to `.env`. Do not commit secrets.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Local SQLite `file:./dev.db` (file is created under `prisma/`) or a Neon pooled Postgres URL. |
| `DATABASE_URL_UNPOOLED` | Direct Neon URL. `scripts/prepare-database.ts` uses it for `prisma db push` when it is set. |
| `NEXT_PUBLIC_APP_URL` | Public origin. Used for the Google redirect when `GOOGLE_REDIRECT_URI` is empty. |
| `OPENAI_API_KEY` | Optional. Blank = scripted Kreyòl demo replies. |
| `OPENAI_BASE_URL` | OpenAI-compatible base. Default `https://api.openai.com/v1`. |
| `OPENAI_MODEL` | Default `gpt-4o-mini`. |
| `ELEVENLABS_API_KEY` | Optional. Blank = text only. |
| `ELEVENLABS_VOICE_ID` | Optional. You can also save a voice id per account in Settings. |
| `GOOGLE_CLIENT_ID` | Optional. Blank = setup instructions, no OAuth button that calls Google. |
| `GOOGLE_CLIENT_SECRET` | OAuth secret. Token exchange runs only when both id and secret exist. |
| `GOOGLE_REDIRECT_URI` | Default `{APP_URL}/api/calendar/google/callback`. |

Google scope: `https://www.googleapis.com/auth/calendar.readonly`.

## Achitekti / Architecture

```
Browser (Kreyòl UI, Web Speech, offline queue)
  -> Next.js App Router
       -> session cookie + Prisma
       -> parser (category + hours, no network)
       -> Konseye: system prompt locked in lib/chat.ts
            -> OpenAI-compatible chat when OPENAI_API_KEY is set
            -> scripted demo otherwise, and always for care-boundary messages
       -> POST /api/tts -> ElevenLabs multilingual model
       -> Google OAuth or ICS import -> events on the day -> confirm to log
```

- **Voice log.** `lib/parser.ts` folds accents and maps Kreyòl, French, and English into one of four categories plus a duration. The UI always shows a confirmation card. The manual form is a normal category / hours / note form.
- **Konseye.** `SYSTEM_PROMPT` requires Kreyòl by default, balance across the four categories, no diagnosis or therapy, and a JSON proposal the person confirms. Medical or crisis wording never reaches the model; the server returns the care script. Free accounts are capped at 30 live assistant replies a month, then the demo script continues.
- **Voice out.** `POST /api/tts` uses `ELEVENLABS_API_KEY` and `user.voiceId` or `ELEVENLABS_VOICE_ID`. Missing key or voice id returns 503 and the button explains settings. No voice id is hardcoded.
- **Calendar.** `/api/calendar/google/start` builds the real Google consent URL when keys exist. The callback stores tokens on the server and never sends them to the browser. Apple and Outlook use a public ICS URL (iCloud public calendar, Outlook publish-to-web) or a pasted `.ics`. Private and non-HTTPS URLs are rejected. Synced events are not auto-logged.
- **Offline.** The composer writes a confirmed log to `localStorage` when `navigator.onLine` is false and flushes it on `online`. Chat can still show the local demo reply, and it says the reply is not saved.
- **Data.** Prisma schema is Postgres-ready. `scripts/prepare-database.ts` switches the provider to `postgresql` when `DATABASE_URL` starts with `postgres`, and keeps SQLite for `file:`. Goals are daily hours, not a percent grid.

## Deploy sou Vercel + Neon

1. Import this GitHub repo as a Next.js project. Framework preset: Next.js. Build command: `npm run build` (it generates the Prisma client, pushes the schema, seeds the demo user if the database is empty of that account, then builds). Install command: `npm install`.
2. Create a Neon Postgres database (Vercel Marketplace). Set `DATABASE_URL` to the **pooled** connection string and `DATABASE_URL_UNPOOLED` to the **direct** connection string. Both need `sslmode=require`.
3. Set `NEXT_PUBLIC_APP_URL` to the production origin, for example `https://your-project.vercel.app`.
4. Optional: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`.
5. Optional Google: create a Web OAuth client. Authorized redirect URI: `https://your-project.vercel.app/api/calendar/google/callback`. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` to that exact callback.
6. Redeploy. Then:

```bash
curl -sI https://your-project.vercel.app/login
```

Expect HTTP 200. Open `/login`, sign in with `demo@ekilib.app` / `ekilib-demo`, and land on `/app`.

Local SQLite does not change: copy `.env.example` to `.env` and run `npm run dev`.

Notes for the parent deploy:

- Do not put a SQLite `file:` URL on Vercel. The serverless filesystem is not the database.
- `npm run build` runs `prisma db push`. On a brand-new Neon database that is safe. Later schema changes should be reviewed before they drop columns.
- Calendar tokens are stored in Postgres for this demo. Treat that database as sensitive. A later pass should encrypt them.
- Pro checkout is intentionally a stub. No Stripe call is made.
- The demo password is reset to `ekilib-demo` every time the seed runs, including production builds, so the public demo login keeps working.

## Scripts

- `npm run dev` — prepare the database, seed, start the dev server
- `npm run build` — prepare the database, then `next build`
- `npm start` — serve the production build
- `npm test` — parser, balance, ICS, and adviser constraint tests
- `npm run db:setup` — generate the client, push the schema, seed
- `npm run db:seed` — seed again
