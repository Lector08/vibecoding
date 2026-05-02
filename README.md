# Task Tracker

Personal task tracker. You write tasks in plain language; the app stores
them per-user. Bilingual (uk / en) and themed (light / dark) from day
one. AI parsing of input and Google Calendar sync land in the next
iteration — for now the input text is stored as the task title with
default priority.

## Stack

- Next.js 15 (App Router) + TypeScript strict
- Tailwind CSS 3 with semantic CSS-variable tokens
- Prisma + Neon Postgres
- NextAuth v5 (Auth.js) — Google OAuth
- next-intl (uk default + en) and next-themes (light / dark / system)

## Local setup — step by step (~15 minutes)

You need three things: a Google OAuth client, a Neon Postgres database,
and an `AUTH_SECRET`. The OpenAI key is optional for this round.

### 1. Install Node dependencies

Already done if you cloned this directory after `npm install`. If not:

```
npm install
```

### 2. Create a Neon database (~2 min)

1. Go to https://console.neon.tech and create a free project named
   `task-tracker`. Pick any region.
2. In **Branches**, create a second branch named `dev` (the default
   branch is `main`).
3. Open the `dev` branch → **Connection details**. You need two URLs
   from the same modal — flip the **Connection pooling** toggle to
   switch between them, click **Show password**, then **Copy snippet**:
   - Toggle **ON** (green) → URL hostname contains `-pooler` → paste
     into `DATABASE_URL`
   - Toggle **OFF** → URL hostname has no `-pooler` → paste into
     `DIRECT_URL`

   Wrap both values in double quotes in `.env.local` because the URL
   contains `&` characters that some shells parse.

### 3. Create a Google OAuth client (~5 min)

1. Open https://console.cloud.google.com and create a new project named
   `task-tracker`.
2. **APIs & Services → Library** → enable **Google Calendar API**.
   (We don't use it yet, but requesting the scope at sign-in now means
   we won't need to re-prompt for consent later.)
3. **APIs & Services → OAuth consent screen**:
   - User type: **External**
   - App name, support email, developer email — fill in
   - **Scopes** → Add or remove scopes → add `.../auth/calendar.events`
   - **Test users** → add your own Google email
   - Save (publishing status stays "Testing", which is fine for personal use)
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Click Create. Copy the **Client ID** and **Client secret**.

### 4. Create `.env.local`

Copy the template and fill in the values you just collected:

```
cp .env.example .env.local
```

Then open `.env.local` and set:

```
AUTH_SECRET=<run: npx auth secret  --  it will print a value>
AUTH_GOOGLE_ID=<from step 3>
AUTH_GOOGLE_SECRET=<from step 3>
AUTH_TRUST_HOST=true
DATABASE_URL=<pooled URL from Neon dev branch>
DIRECT_URL=<direct URL from Neon dev branch>
# OPENAI_API_KEY is optional for this round - leave empty
```

`AUTH_SECRET` can be generated with:

```
npx auth secret
```

It will print the line to paste.

### 5. Apply the database schema

```
npm run db:migrate -- --name init
```

This creates the `User`, `Account`, `Session`, `VerificationToken`, and
`Task` tables on the Neon `dev` branch. You can inspect them with:

```
npm run db:studio
```

### 6. Run the dev server

```
npm run dev
```

Open http://localhost:3000 — you should be redirected to
`http://localhost:3000/uk/login`.

## What to test

1. **Locale**: top-right language switcher flips uk ↔ en. URL changes
   between `/uk/...` and `/en/...`.
2. **Theme**: top-right theme switcher → light / dark / system. Reload
   and the choice persists. First load matches your OS preference.
3. **Sign-in**: click *Увійти через Google* / *Sign in with Google*.
   Approve the consent screen. You land back on `/uk` (or `/en`).
4. **Create a task**: type something into the textarea (any language),
   press the button or `Cmd/Ctrl + Enter`. The task should appear in
   the list with a yellow priority dot and "no deadline".
5. **Mark as done**: click the checkbox. The card grays out and the
   title gets a strikethrough. Reload — the state persists.
6. **Sign out**: avatar menu → sign out → you go back to login.
7. **Mobile**: open Chrome DevTools device toolbar — the layout
   should fit, the textarea should be tappable, the toggles should
   stay reachable.

## Useful scripts

| command               | what it does                                       |
| --------------------- | -------------------------------------------------- |
| `npm run dev`         | Dev server with Turbopack at http://localhost:3000 |
| `npm run build`       | Production build (runs `prisma generate` first)    |
| `npm run typecheck`   | `tsc --noEmit`                                     |
| `npm run lint`        | Next.js ESLint                                     |
| `npm run db:migrate`  | Apply migrations to the database in `DATABASE_URL` |
| `npm run db:studio`   | Open Prisma Studio in the browser                  |

## What's intentionally NOT in this round

- **Real GPT-4o-mini parsing** — `lib/ai/parse-task.ts` is a stub that
  returns the raw text as the title. The next iteration will replace
  the function body with a real OpenAI call (json_schema response
  format, validated by the existing Zod schema) without changing the
  call site.
- **Google Calendar sync** — scope is already requested at sign-in, so
  no re-consent needed when we wire it up. Tokens land in
  `Account.refresh_token` / `Account.access_token`.
- **Delete, filter, sort, edit, overdue, AI suggestions** — all
  post-MVP per the brief.

## Project structure

```
.
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx       # html, providers, theme, intl
│   │   ├── page.tsx         # tasks page (auth-gated)
│   │   ├── login/page.tsx
│   │   └── not-found.tsx
│   ├── api/auth/[...nextauth]/route.ts
│   └── globals.css          # Tailwind + CSS variable tokens
├── components/
│   ├── ui/                  # primitives (button, checkbox)
│   ├── features/            # header, theme/locale toggle, tasks UI
│   └── providers/           # theme provider
├── i18n/
│   ├── routing.ts
│   └── request.ts
├── lib/
│   ├── actions/             # server actions: tasks, auth
│   ├── ai/parse-task.ts     # GPT-4o-mini stub
│   ├── schemas/task.ts      # Zod schemas
│   ├── auth.ts              # NextAuth config
│   ├── prisma.ts            # PrismaClient singleton
│   └── utils.ts             # cn()
├── messages/
│   ├── uk.json              # default
│   └── en.json
├── prisma/schema.prisma
├── types/next-auth.d.ts
├── env.ts                   # validated env (@t3-oss/env-nextjs)
├── middleware.ts            # next-intl locale routing
├── tailwind.config.ts
└── next.config.ts
```

## Troubleshooting

- **`Invalid environment variables`** on `npm run dev` — open
  `.env.local` and make sure every required variable from
  `.env.example` is set (they're all required except `OPENAI_API_KEY`
  and `DIRECT_URL`).
- **Google sign-in returns `redirect_uri_mismatch`** — the redirect URI
  in your OAuth client must be exactly
  `http://localhost:3000/api/auth/callback/google` (no trailing slash).
- **`prisma generate` fails on install** — re-run `npx prisma generate`
  manually.
- **Build fails with env errors but you want to test the bundle** — set
  `SKIP_ENV_VALIDATION=true` before `npm run build`.
