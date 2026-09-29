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
- Log by voice or text: `Mwen travay 3 èdtan`, `Mwen fè espò`. The mic records audio and Whisper transcribes Haitian Creole (`ht`). Confirm category and hours. A manual form stays underneath.
- Check habits, leave a 1–5 check-in, and read a balance score plus a plain-language insight.
- Talk to **Konseye Ekilib** by typing or with the same mic. It stays in Kreyòl unless you ask for French or English, encourages balance, and refuses medical or therapy diagnosis. A voice turn is answered in Kreyòl text and spoken with the ElevenLabs voice. Proposed logs wait for confirmation.
- Connect Google Calendar when OAuth keys exist. Import Apple, Outlook, or any other calendar with an HTTPS ICS link or a pasted ICS file. Events show on the day; you confirm before they become logs.
- Hear replies when ElevenLabs is configured. Voice turns play the answer automatically. Without a key or voice id, the app stays text-only and settings explain what to add.
- If the network drops, confirmed logs wait in the browser and send when you are back. Live AI and voice need a connection. The UI says so.

Free includes logging, goals, habits, demo advice, and 80 logs a month. Pro is an $8/month stub: AI adviser, ElevenLabs, calendar sync, and no monthly cap. The upgrade button does not charge a card.

## Anviwònman / Environment

Copy `.env.example` to `.env`. Do not commit secrets.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Local SQLite `file:./dev.db` (file is created under `prisma/`) or a Neon pooled Postgres URL. |
| `DATABASE_URL_UNPOOLED` | Direct Neon URL. `scripts/prepare-database.ts` uses it for `prisma db push` when it is set. |
| `NEXT_PUBLIC_APP_URL` | Public origin. Used for the Google redirect when `GOOGLE_REDIRECT_URI` is empty. |
| `OPENAI_API_KEY` | Optional. Blank = scripted Kreyòl demo replies. Also used for speech-to-text when `GROQ_API_KEY` is empty. |
| `OPENAI_BASE_URL` | OpenAI-compatible base. Default `https://api.openai.com/v1`. Used for chat and, as a fallback, for Whisper. |
| `OPENAI_MODEL` | Default `gpt-4o-mini`. |
| `OPENAI_STT_MODEL` | Whisper model when OpenAI does speech-to-text. Default `whisper-1`. |
| `GROQ_API_KEY` | Optional. Free-tier Whisper for Kreyòl speech-in. Preferred over OpenAI when set. |
| `GROQ_STT_MODEL` | Default `whisper-large-v3` (supports Haitian Creole, language `ht`). |
| `STT_PROVIDER` | Optional `groq` or `openai`. Default picks Groq when `GROQ_API_KEY` is set, otherwise OpenAI. |
| `ELEVENLABS_API_KEY` | Optional. Blank = text only. Speech-out only; Scribe does not transcribe Haitian Creole. |
| `ELEVENLABS_VOICE_ID` | Optional. You can also save a voice id per account in Settings. Production uses the Kreyol Chris clone. |
| `GOOGLE_CLIENT_ID` | Optional. Blank = setup instructions, no OAuth button that calls Google. |
| `GOOGLE_CLIENT_SECRET` | OAuth secret. Token exchange runs only when both id and secret exist. |
| `GOOGLE_REDIRECT_URI` | Default `{APP_URL}/api/calendar/google/callback`. |

Google scope: `https://www.googleapis.com/auth/calendar.readonly`.

## Achitekti / Architecture

```
Browser (Kreyòl UI, mic recording, offline queue)
  -> Next.js App Router
       -> session cookie + Prisma
       -> POST /api/stt -> Whisper language ht (Groq, else OpenAI)
       -> parser (category + hours, no network)
       -> Konseye: system prompt locked in lib/chat.ts
            -> OpenAI-compatible chat when OPENAI_API_KEY is set
            -> scripted demo otherwise, and always for care-boundary messages
            -> Kreyòl check before a reply is stored or spoken
       -> POST /api/tts -> ElevenLabs multilingual model, Kreyòl text
       -> Google OAuth or ICS import -> events on the day -> confirm to log
```

- **Voice in.** The mic does not use the browser `SpeechRecognition` API. Chrome, Safari, and Firefox often reject `ht-HT` (`language-not-supported`). The old button then restarted recognition in French, so Kreyòl was transcribed as French or English. The browser now records a short clip (`audio/webm` or `audio/mp4`) and `POST /api/stt` sends it to Whisper with `language=ht` when the account language is Kreyòl. Groq `whisper-large-v3` is preferred (`GROQ_API_KEY`, free tier). If that key is empty and `OPENAI_API_KEY` is set, OpenAI `whisper-1` is used. With neither key, the mic explains what to add and typing still works. There is no silent French fallback.
- **Voice log.** `lib/parser.ts` folds accents and maps Kreyòl, French, and English into one of four categories plus a duration. The UI always shows a confirmation card. The manual form is a normal category / hours / note form. On the home page the same phrase is also sent to Konseye. If the parser already has a category and a duration, the chat card does not ask you to confirm a second copy.
- **Konseye.** `SYSTEM_PROMPT` requires Kreyòl by default, balance across the four categories, no diagnosis or therapy, and a JSON proposal the person confirms. Medical or crisis wording never reaches the model; the server returns the care script. If the account language is Kreyòl and the model answers in English or French, the server asks once for a Kreyòl rewrite before saving or speaking. A Kreyòl phrase still gets a Kreyòl reply when the account language is French or English. Free accounts are capped at 30 live assistant replies a month, then the demo script continues.
- **Voice out.** `POST /api/tts` uses `ELEVENLABS_API_KEY` and `user.voiceId` or `ELEVENLABS_VOICE_ID` with `eleven_multilingual_v2`. That model does not list Haitian Creole as an official language; the cloned voice reads the Kreyòl text. Small numbers are spelled in Kreyòl (`3` → `twa`) so the voice does not say them in English. A reply that came from the mic plays automatically. Missing key or voice id returns 503 and the button explains settings. No voice id is hardcoded.
- **Calendar.** `/api/calendar/google/start` builds the real Google consent URL when keys exist. The callback stores tokens on the server and never sends them to the browser. Apple and Outlook use a public ICS URL (iCloud public calendar, Outlook publish-to-web) or a pasted `.ics`. Private and non-HTTPS URLs are rejected. Synced events are not auto-logged.
- **Offline.** The composer writes a confirmed log to `localStorage` when `navigator.onLine` is false and flushes it on `online`. Chat can still show the local demo reply, and it says the reply is not saved.
- **Data.** Prisma schema is Postgres-ready. `scripts/prepare-database.ts` switches the provider to `postgresql` when `DATABASE_URL` starts with `postgres`, and keeps SQLite for `file:`. Goals are daily hours, not a percent grid.

## Deploy sou Vercel + Neon

1. Import this GitHub repo as a Next.js project. Framework preset: Next.js. Build command: `npm run build` (it generates the Prisma client, pushes the schema, seeds the demo user if the database is empty of that account, then builds). Install command: `npm install`.
2. Create a Neon Postgres database (Vercel Marketplace). Set `DATABASE_URL` to the **pooled** connection string and `DATABASE_URL_UNPOOLED` to the **direct** connection string. Both need `sslmode=require`.
3. Set `NEXT_PUBLIC_APP_URL` to the production origin, for example `https://your-project.vercel.app`.
4. Optional: `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `GROQ_API_KEY`, `GROQ_STT_MODEL`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`. Set `GROQ_API_KEY` for Kreyòl speech-in on the free Whisper tier. `ELEVENLABS_VOICE_ID` is the voice that speaks answers (Kreyol Chris in production).
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
