# QuitTobacco

A friendly, game-like tobacco-cessation web app for a first-time smartphone user in a
tier-2 Indian city, on a cheap Android over patchy 3G — built to be simple enough to
navigate without instructions, and trustworthy enough that a dentist would recommend it.
The clinic runs an **admin panel** where each patient is found by their **Patient ID**
and sent reports, images and documents; the patient reads them in the app.

Built from scratch with **Next.js 16 (App Router) · React 19 · TypeScript (strict) ·
Tailwind CSS v4**. Ships as an installable, offline-first PWA in **English + Hindi**.

---

## Quickstart

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm run start   # production
npm test           # 70 unit tests (scoring / rewards / health / auth / otp)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint (flat config)
```

**Accounts are the one server-side thing.** Sign-in is required: every route
except `/login`, `/forgot`, `/reset`, `/offline` and `/supporter` redirects to
`/login` without a session. Accounts live in **Postgres** — passwords are scrypt-hashed, sessions
are signed JWTs in an HttpOnly cookie. All SQL is in one file
(`src/lib/auth/db.ts`); the schema is created on first query.

**The quit journey is backed up to the account.** Check-ins, streak, intake
answers, badges and rewards sync to Postgres (`user_state`, a JSONB document),
so signing in on a new phone restores the journey instead of replaying
onboarding. Reports the clinic sends are the opposite: they live **only** on
the server (`patient_documents`) and are fetched when opened, so a lost phone
never carried a copy.

The device remains the working copy: every write lands locally first, so the app
keeps working with no signal (which SOS depends on). Conflicts resolve
last-write-wins on the device clock. Signing out flushes the journey to the
server and then wipes the device, so a shared phone never shows the previous
person's data.

The device copy lives in localStorage via Zustand `persist`. After signing in,
`/` waits for the restore, then routes by real state to onboarding or the
dashboard.

### Environment

Two variables, in `.env.local` for development and in the Netlify UI for
production. Neither is ever committed.

On Vercel, `vercel install neon` provisions a database and injects the
connection string automatically — providers name it differently, so the app
accepts `DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL` and the unpooled
variants, preferring pooled ones.

```bash
# Any Postgres. Locally:  createdb quittobacco_dev
DATABASE_URL=postgres://localhost:5432/quittobacco_dev
# Required in production (the app refuses to boot without it). Generate with:
#   openssl rand -base64 32
SESSION_SECRET=…
# Password-reset e-mail. Required in production — requesting a reset throws
# without it rather than silently not sending. https://resend.com (free tier)
RESEND_API_KEY=re_…
MAIL_FROM="QuitTobacco <noreply@yourdomain.com>"
# Absolute base URL used to build reset links. Netlify sets URL and Vercel sets
# VERCEL_PROJECT_PRODUCTION_URL automatically; set APP_URL for a custom domain.
APP_URL=https://your-site.vercel.app
# Operator access to /backend. Comma-separated, lowercase. Exists so the FIRST
# operator can get in on a fresh deploy; after that prefer the database flag:
#   UPDATE users SET is_admin = true WHERE email = 'you@example.com';
ADMIN_EMAILS=you@example.com
# "Continue with Google" — optional; the button is simply absent without these.
# Create both at https://console.cloud.google.com/apis/credentials (OAuth
# client ID, type "Web application"), with an Authorized redirect URI of
# {APP_URL}/api/auth/google/callback for every environment you run in
# (http://localhost:3000/api/auth/google/callback locally, and your production
# URL) — Google rejects the callback otherwise.
GOOGLE_CLIENT_ID=….apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=…
# Mobile OTP sign-in — SMS delivery via Twilio's HTTPS API (any other HTTPS
# SMS API can be dropped into src/lib/auth/sms.ts). Without these, development
# shows the code on the login page instead of texting it; production hides
# the OTP option entirely rather than offer a text that never arrives.
TWILIO_ACCOUNT_SID=AC…
TWILIO_AUTH_TOKEN=…
TWILIO_FROM=+1…            # or TWILIO_MESSAGING_SERVICE_SID=MG…
# Optional demo number with a FIXED code, for showing OTP sign-in to a client
# without a provider or a phone. Public by design (printed on the login page,
# like the demo e-mail/password) — never a real person's number. The number
# must belong to an account (create one and put it in the mobile field).
NEXT_PUBLIC_DEMO_PHONE=+919999999999
NEXT_PUBLIC_DEMO_OTP=123456
```

TLS is inferred from the host — off for `localhost`, on for anything else —
and an explicit `?sslmode=require|disable` always wins. Server certificates are
verified; set `PGSSL_NO_VERIFY=1` only for a self-signed server you control. On
Neon / Netlify DB use the **pooled** endpoint (the host containing `-pooler`).

### Sign-in with Google

Hand-rolled OAuth 2.0 (Authorization Code flow) at `/api/auth/google` →
`/api/auth/google/callback`, not a library — the app already owns its session
and cookie handling, and a full auth framework would duplicate that for one
extra provider. The ID token's signature is verified against Google's own
published keys via `jose` (already a dependency for our session JWTs), and only
a verified email is accepted.

Finding-or-creating a user is by e-mail, so an existing password account and a
Google sign-in with the same address are the same account — this is standard
practice, but relies on Google having actually verified the address; the code
checks `email_verified` explicitly and rejects the sign-in otherwise. A
Google-only account has `password_hash = NULL`; signing in with a password
against one fails with the same generic message as a wrong password, so the
form can't be used to learn how an address signs in.

### Admin panel

`/backend` lists every patient and their synced journey, searchable by Patient
ID, name, e-mail or phone, with a JSON export at `/backend/export`; each row
opens `/backend/patients/[id]`. It is **operator-only**: `users.is_admin`, or
an address in `ADMIN_EMAILS`. Non-operators get a 404 rather than a 403 — a
"forbidden" reply would confirm the route exists and is worth attacking — and
the Profile link is hidden from them. The panel's layout repeats the check, so
a non-operator never sees admin chrome framing a 404.

**Patient ID.** Every account has a sequential `users.patient_no`, shown as
`QT-000042` (`src/lib/patient.ts`). It exists because a clinician reads it off
the patient's phone across a desk: a six-digit number can be said aloud and
typed without error, a UUID cannot. The patient's Profile shows it large, with
a copy button; the admin search accepts `QT-000042`, `42`, a name, an e-mail
or a phone number.

**Reports, images and documents** flow one way: clinic → patient. The patient
page has the upload form; the patient app has no upload, no file input and no
camera anywhere (`Permissions-Policy: camera=()` at the browser level, so no
future page can quietly reintroduce one). What the clinic sends appears under
**My reports** (`/reports`) with a "new" badge and a count on the dashboard.

- Files are stored as `BYTEA` rows in `patient_documents`, capped at **4 MB**
  each. Postgres stays the app's single stateful dependency, the file is
  covered by the same backups as the account, and there is no second bucket
  with its own access policy to get wrong. (`serverActions.bodySizeLimit` is
  raised to 5 MB to admit them; Vercel's function-body limit is 4.5 MB.)
- Accepted types are JPEG, PNG, WebP, PDF and `.docx`, verified by **magic
  bytes**, not the browser's claimed MIME — a renamed `.html` declared as
  `image/png` is rejected. SVG is deliberately excluded (it can carry script).
  The stored extension always matches the verified type.
- `GET /api/documents/[id]` serves the bytes to exactly two callers — the
  patient it belongs to and an operator — and returns the same 404 to everyone
  else, so the response never confirms a document exists. Served
  `private, no-store`, `nosniff`; images and PDFs inline, everything else as
  an attachment (`?download=1` forces a save prompt).
- `seen_at` is set the first time the **patient's** browser fetches the file
  (an operator previewing their own upload does not count). The reports list
  lazy-loads image previews, so an image counts as seen once it has actually
  scrolled into view; a PDF has no preview and stays "new" until tapped. The
  admin page shows "Opened" / "Not opened yet" per document.
- Deleting an account cascades to its documents — that is what "delete my
  account" must mean for medical material. Deleting the operator who sent one
  does not (`uploaded_by ON DELETE SET NULL`).

It does not show passwords, because none are stored: each is a one-way scrypt
hash with a per-user salt. There is no plaintext to reveal to anyone, operator
included. Users who forget theirs use the reset flow. What the dashboard shows
instead is a **login activity log** (`login_events`) — every sign-in and
sign-up attempt, successful or not, with method, device, IP and a failure
reason where relevant. That is the honest, auditable version of "see
credentials in a dashboard": not the secret, which cannot exist here, but every
time one was used. The table survives account deletion (`user_id` is nullable,
`ON DELETE SET NULL`), since an audit trail that disappears with the account it
describes defeats the point of keeping one.

### Demo mode

Two optional environment variables put the app into demo mode. Both are **off
unless set**, so a normal deployment is unaffected.

```bash
# Prints a demo credential card on the sign-in form, with a button that fills
# the fields. Safe to leave set: it names one specific, harmless account (see
# below) rather than opening the app up generally — but printing a password on
# a public page is still a deliberate choice, so decide, don't default to it.
NEXT_PUBLIC_DEMO_EMAIL=demo@example.com
NEXT_PUBLIC_DEMO_PASSWORD=…
```

Signing out of the account named in `NEXT_PUBLIC_DEMO_EMAIL` wipes its synced
journey (`isDemoEmail` in `demo.ts`), so every demo run starts the
questionnaire from scratch, however many people share the credential — and
only that one account. This replaced an earlier global "always onboard" flag
that would have forced every real user back through the questionnaire on every
login, silently resetting their quit date and streak — the kind of thing that
looks like a harmless demo toggle and is actually a data-loss bug waiting for
production. Deleted rather than left around to be flipped on by accident.

### Deployment self-check

`GET /api/health` reports whether the deployment is actually configured:

```json
{ "ready": false,
  "checks": { "database": { "ok": false, "error": "no connection string" },
              "sessionSecret": { "ok": false, "hint": "openssl rand -base64 32" } } }
```

200 when sign-in will work, 503 when it won't. It reports presence and
reachability only — never a secret's value, and never the connection string.
Without it a misconfigured deploy is indistinguishable from a broken one,
because every page just renders the error boundary.

### Security

- **Passwords** — scrypt (`node:crypto`), 16-byte salt per user, constant-time
  compare. Minimum 10 characters plus a small blocklist of well-known weak
  passwords and single-character runs (`validate.ts`) — deliberately **not**
  forced composition rules (no "must contain a symbol"). NIST 800-63B, the
  standard a government context is actually measured against, recommends
  length and a blocklist over composition rules precisely because forced
  complexity measurably pushes real users toward `Passw0rd!` and reused
  patterns rather than stronger passwords.
- **Sessions** — HS256 JWT in an HttpOnly, SameSite=Lax cookie; `Secure` in
  production (off in dev so LAN phone testing over http works). 30-day expiry.
- **Brute force** — 8 sign-ins per e-mail per 15 minutes, counted in Postgres
  (`login_attempts`) so it survives serverless cold starts. Fails open if the
  counter itself errors: the password check is still the real gate.
- **Enumeration** — sign-in returns one message for both "no such user" and
  "wrong password". Sign-up deliberately does reveal a taken e-mail, so the user
  can be sent to sign-in instead.
- **Audit log** — every sign-in/sign-up, successful or not, in `login_events`
  (method, device, IP, failure reason), visible on `/backend`. Survives account
  deletion on purpose — see "Backend dashboard" above.
- **Content-Security-Policy** — a real `script-src` now, not just
  `frame-ancestors`: per-request nonce + `'strict-dynamic'`, generated in
  `proxy.ts` (a static header in `next.config.ts` can't carry a per-request
  value). This is what actually blocks an injected `<script>` from running.
  `style-src` stays `'unsafe-inline'` in both environments — verified against a
  live run, not assumed: Chromium enforces `style-src` against React's runtime
  `style={{...}}` prop mutations too, not just `<style>` tags, and this app
  uses plenty of those. Nonce-ing `style-src` would mean rewriting every one of
  them for a directive defending a far smaller risk (CSS injection) than
  `script-src` does (arbitrary script execution) — not a good trade. Reading
  the nonce (`headers()` in the root layout) opts every route into dynamic
  rendering, which a nonce-based CSP requires; the routes that cost is paid on
  are small, low-traffic auxiliary pages (`/forgot`, `/offline`, `/supporter`),
  not the patient-facing screens, which were already dynamic for the auth check.
- **Headers** — `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy` with the camera, microphone, geolocation and payment
  APIs all locked (nothing in the app captures media — images reach a patient
  only from the clinic), HSTS in production, `X-Powered-By` removed.
- **Patient documents** — operator-only upload, magic-byte type checks, 4 MB
  cap, owner-or-operator download with a uniform 404, `no-store`. See "Admin
  panel" above.

---

## The daily loop

`intake form → starting badge → learn → plan → craving SOS → reward → clinic report`

The user lives in: **check in → craving hits → SOS → quick actions → progress → reward.**

## Screens

`/login` (language picker → email + password / mobile OTP / Google, sign in /
create account) · `/onboarding` (intro → 12-question intake → badge reveal) ·
`/dashboard` · `/sos` (urge-surfing timer → quick actions) · `/learn` (lessons +
watch tracking) · `/reports` (what the clinic has sent you) · `/plan` · `/rewards`
(ladder + scratch cards + wallet) · `/progress` (recovery timeline, savings, badges,
trigger insight) · `/help` · `/profile` (with your Patient ID) · `/supporter`
(read-only page a family member opens from a shared link, in the shared language).
Offline fallback at `/offline`. Operators: `/backend` (patients, search, audit log)
and `/backend/patients/[id]` (one patient + send a report).

The patient app renders as a **mobile-only view at every screen size** — no desktop
sidebar; on wider screens it centres as a framed phone-width column. The admin panel
is desktop-first. Theme **auto-follows the OS** (`prefers-color-scheme`,
live-updating), with no manual toggle.

---

## Delight layer (bright where it earns it, calm where it counts)

- **Recovery ring** — a signature ring that fills as the body heals, with a sunrise at
  its centre, on the gradient hero of the dashboard, progress and supporter pages. It
  replaced an earlier growing-plant illustration: a leaf is the thing these users are
  trying to leave behind, and the app is about the morning after.
- **Colour-coded tiles** — every destination owns one hue (reports are sky, the plan is
  violet, help is rose, rewards are amber…) and keeps it everywhere it appears, so the
  app can be navigated by colour alone — the convention UPI and delivery apps have
  already taught this audience.
- **Metallic badge tiers** — bronze/silver/gold/platinum/diamond each have their own metal
  (token-backed, AA-verified), so leveling up genuinely looks different.
- **Confetti** — a one-shot burst on badge unlock and reward reveal (collapses under
  `prefers-reduced-motion`).
- **Shareable image card** — "Share my progress" renders a streak card to PNG and shares
  it via the Web Share API (image), falling back to a WhatsApp text link. The growth loop.
- **Supporter mode** — Profile → "Share with a supporter" builds a `/supporter?…` link
  encoding name/days/saved/language; the supporter sees the ring + progress and sends
  encouragement back via WhatsApp. No backend, no account.

The brand gradient is reserved for the one thing that matters on a screen — the streak
hero, the primary action, the brand mark — and the SOS button is the only warm-red
gradient in the app, so it is unmistakable. The admin panel stays restrained.

---

## What's REAL vs SIMULATED

**Real (works end to end):**

- **Dependence scoring** — the published **Fagerström** instruments, scored correctly
  and unit-tested. Cigarettes/bidi → **FTND** (Heatherton et al. 1991); gutkha/khaini →
  **FTND-ST** (Ebbert et al. 2006). Bands 0–2 / 3–4 / 5 / 6–7 / 8–10.
- **Every downstream number is form-driven** — money saved from the user's real per-day
  spend, plan from their real triggers, starting badge from motivation + dependence.
- **Rewards** — ladder, scratch-card reveal (canvas + keyboard/screen-reader fallback),
  wallet, and integrity gating are all real logic.
- **Persistence, offline, i18n, video-watch tracking, streak-across-slips, trigger
  insights, recovery timeline, savings goal** — all real.

- **Clinic reports** — real files, uploaded by a real operator, stored in the database
  and served only to that patient. There is no in-app "scan", no self-photo and no
  simulated health score: anything about a patient's mouth comes from the clinician who
  examined it.

**Simulated (clearly labelled in-app):**

- **Lesson videos** use a demo player (no real video files — offline + bundle budget).
  The **watch mechanic is honest**: progress only advances while playing and "completed"
  requires reaching the end. Compliance is surfaced on the admin panel.
- **Reward vouchers are watermarked "DEMO — not a real voucher."** See *Placeholders*.

## Deliberately NOT built (non-goals)

❌ Leaderboards / user-vs-user comparison · ❌ virtual currency, coins or points that buy
nothing · ❌ streak-shaming or guilt notifications · ❌ daily-login rewards / engagement
farming · ❌ social feed, likes, followers · ❌ an AI chatbot (can't be made safe for
medical questions at this scope) · ❌ ads, upsells, paywalls · ❌ more than five items in
the bottom nav. Tier-2 extras (web push, quiz, voice journal, live supporter link) were
scoped out; "share your progress" ships as a WhatsApp/Web-Share snapshot instead.

---

## Rewards are earned by showing up

`loginDays` records each distinct date the user actually opens the app while
signed in. `activeDaysSinceQuit` counts those from the start of the current
streak (the quit date, or the day after the most recent slip), and **that** is
what the reward ladder gates on.

Elapsed time alone would let someone backdate their quit date at sign-up and
unlock the whole ladder without ever returning. The recovery timeline still uses
real elapsed days — nicotine leaves the body on its own schedule — so the two
numbers differ on purpose, and the rewards screen says so.

Progress → Overview shows the login calendar these days come from.

## Password reset

`/login → Forgot your password?` → `/forgot` → e-mailed link → `/reset`.

- The link carries 256 bits of entropy; only its SHA-256 is stored, so a leaked
  database yields no usable links.
- Single-use and 30-minute expiry. Using it burns every other outstanding reset
  token for that account.
- The request form answers identically whether or not the address is registered,
  so it can't be used to discover who has an account. Capped at 3 per address
  per 15 minutes so it can't be used to flood someone's inbox.
- Completing a reset bumps `users.token_version`, which invalidates **every
  existing session everywhere** — the point of resetting a password you believe
  someone else knows.

### Sign-in with mobile number + OTP

Two server actions (`requestOtp`, `verifyOtp` in `src/lib/auth/actions.ts`)
and the `auth_tokens` table that was reserved for it. Works for any account
with a mobile number on file — `users.phone` has been collected at sign-up
(optional, validated, UNIQUE) since the first release, so nobody re-registers.
A number with no account is told so and offered the sign-up form with the
number pre-filled; the sign-up form already reveals whether a number is taken,
so this leaks nothing new.

- 6-digit code from `crypto.randomInt`, 5-minute expiry, single use. Asking
  for a new code burns the previous one.
- Stored as SHA-256 of `tokenId:code`, so a database dump can't be cracked
  in one pass across every live code — and no live code outlives five minutes.
- Online guessing is the real threat for a million-way secret, so it is capped
  hard: 5 wrong codes per number per 15 minutes, after which the code is
  burned and a new one has to be requested. Sends are capped at 3 per number
  per 15 minutes so the form can't be used to spam (or bill) anyone's phone.
- Every attempt — sent, unknown number, wrong code, throttled, success — lands
  in the `/backend` audit log with method **Mobile OTP**.
- The text carries the WebOTP suffix (`@host #code`) so Chrome on Android can
  offer to auto-fill it; the input is `autocomplete="one-time-code"` for iOS.
- Delivery is Twilio over HTTPS (`src/lib/auth/sms.ts`); no credentials in
  development means the code is printed on the page and in the server log,
  and in production the option is hidden. `/api/health` reports the `sms`
  check. An optional fixed-code demo number exists for client walkthroughs
  (`NEXT_PUBLIC_DEMO_PHONE` / `NEXT_PUBLIC_DEMO_OTP`).

Not yet built: adding or changing a mobile number from Profile after sign-up,
and accounts with a phone but no e-mail (`users.email` stays NOT NULL).

---

## Placeholders — provide these to go live

- **Support email & phone** (`src/data/contact.ts`) — currently placeholders.
- **Reward partner** (`src/data/config.ts`) — a real partner exists, but until the partner
  name + redemption mechanism are wired in, `DEMO_MODE = true` watermarks every voucher so
  we never render a fake-looking real code. Flip the flag and supply real codes to go live.

The **India National Tobacco Quitline** number *is* real and verified:
**1800-112-356** (MoHFW / NTQLS).

---

## Clinical sources (also cited in code comments)

- FTND: Heatherton TF et al. (1991) — <https://cde.nlm.nih.gov/formView?tinyId=myLzkabPx>
- FTND-ST: Ebbert JO et al. (2006) — <https://www.sciencedirect.com/science/article/abs/pii/S0306460305003084>
- Recovery timeline (WHO, verified): <https://www.who.int/news-room/questions-and-answers/item/tobacco-health-benefits-of-smoking-cessation>
- Quitline (MoHFW NTQLS): <https://ntcp.mohfw.gov.in/national_tobacco_quit_line_services>

Every health claim in the recovery timeline links to its WHO source in-app.

---

## Architecture

```
src/
  app/            App Router. (onboarding) full-screen; (app) group = shell (bottom nav
                  + persistent SOS); /backend outside the shell (operator-only, desktop).
  components/ui/  Hand-built primitives on Tailwind tokens (no component library),
                  including IconTile — the colour-coded feature tiles.
  components/feature/  ScratchCard, BadgeReveal, RecoveryRing, BreathingCircle,
                  QuickActions, VideoPlayer, CheckIn, ReportsScreen, DocumentUploadForm,
                  BackendDashboard, screens.
  data/           ALL seed data, typed, one file per domain, bilingual.
  lib/
    scoring.ts    PURE — FTND/FTND-ST, readiness, badge tiers.  (tested)
    rewards.ts    PURE — ladder, eligibility, integrity gates.  (tested)
    health.ts     PURE — streak across slips, savings, recovery %, trigger insights. (tested)
    format.ts     PURE — dates (local-safe), INR currency.
    store.ts      Zustand + persist + hydration guard.  selectors.ts derives from it.
    patient.ts    PURE — Patient ID formatting/parsing and the admin search match.
    documents.ts  Accepted file types + magic bytes, size cap, shared by form and action.
    auth/document-actions.ts  Server Actions: upload / delete (operator-only).
  i18n/           react-i18next + en.json / hi.json.
```

**Rules honoured:** server components by default (`'use client'` at the smallest leaf);
no raw hex or raw Tailwind palette classes outside `globals.css`; design tokens drive
light + dark; every visible control works end to end.

### Design system
A lavender-tinted surface, two text colours, **indigo-violet as the one brand hue** with
a sunrise gradient (indigo → violet → pink) reserved for the streak hero, the primary
action and the brand mark; **eight tinted tile hues** so each feature has its own colour;
**gold reserved exclusively for rewards/badges**; a warm-red gradient only for SOS. Every
fg/bg pair is WCAG-AA verified in both themes. Motion budget: content fade, the
functional breathing/countdown, and the badge/scratch reveal — everything else deleted,
all respecting `prefers-reduced-motion`.

### Internationalisation
Chrome strings live in `src/i18n/*.json`; content strings are bilingual objects in
`src/data`. Adding **Telugu / Tamil / Marathi / Bengali / Kannada** is dropping in a JSON
file and one row in `src/i18n/languages.ts` — no component changes.

---

## Verified against the definition of done

| Target | Result |
|---|---|
| `npm run build`, `tsc --noEmit`, `eslint` | ✅ clean, zero warnings |
| Unit tests (scoring / rewards / health / auth / otp) | ✅ 70 passing |
| First-load JS < 200 KB | ✅ **187–189 KB** transferred (gzip); Recharts lazy-loaded |
| LCP < 2.5s on throttled 3G | ✅ **~620–690 ms** (emulated Fast 3G) — static prerendered HTML |
| Offline (SOS, breathing, quick actions, content) | ✅ service worker serves cached pages |
| Refresh survives (streak, rewards, watch progress) | ✅ Zustand persist + hydration guard |
| Accessibility | ✅ **0 axe violations** (WCAG 2a/2aa) on onboarding, dashboard, rewards, SOS, progress |
| Installable PWA, standalone | ✅ manifest + maskable icons + service worker |
| Scratch card claimable without a drag | ✅ keyboard + screen-reader "Reveal" button |
| A logged slip doesn't wipe earned rewards | ✅ (unit-tested) |
| Responsive at 375 / 768 / 1440 | ✅ mobile-first; sidebar on desktop |
| Theme + language switch, no flash / full retranslate | ✅ inlined theme script; Devanagari renders |

**Codebase:** ~6,700 lines of TS/TSX + ~730 lines of i18n JSON + 421 lines of tests.
This is *larger* than the previous ~4,650-line version — because that version faked or
omitted most of this: it had no real intake form, no FTND scoring, no persistence, no
real i18n, no tests, no PWA/offline, no admin panel. The new code is DRY (data
centralised, domain logic in tested pure modules) with no dead controls or orphan routes.

> Demo vouchers and health information here are for a product demo — not medical
> advice. Consult a healthcare professional for medical concerns.
