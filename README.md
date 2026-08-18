# LeadFinder

A self-hosted tool for discovering, filtering, enriching, managing, and
exporting B2B leads sourced from Google via the **official Google Places API
(New)** — not a Google Maps page scraper. Every business it returns comes
from Google's own paid API, and every enrichment fact (emails, social links,
tech stack) is read from that business's own public website.

**Pipeline:**

1. **Discovery** — search by category or free-text keyword, in a location
   and radius you choose. Stores name, address, phone, website, rating,
   review count, category, coordinates, and — if you ask for them —
   opening hours, price level, and business status. Already-known
   businesses (matched by Google's own Place ID) are automatically skipped
   on re-runs instead of being re-added as duplicates.
2. **Enrichment** — for every lead with a website, crawls that business's
   own homepage (and same-site Contact/About pages if needed) for an email
   address and social links. Respects `robots.txt` and rate-limits itself
   per domain.
3. **Outreach** — build reusable message templates with placeholders that
   auto-fill from each lead's data, then copy the personalized message or
   send it straight to WhatsApp with one click.

Both discovery and enrichment are resumable: pause/cancel a running search,
and a lead already enriched (found or confirmed not-found) is skipped on
future runs unless you explicitly re-crawl it.

## Features

- **Two search modes** — Category (Google's Nearby Search over a curated
  list of Places types, e.g. "dentist") and Keyword (free-text Text Search,
  e.g. "emergency dentist near me"). Radius up to 50 km (Google's own API
  limit for both modes), a max-leads cap from 10 up to 5000, a language
  code, and an Open/Closed/Both post-fetch filter.
- **Choose which fields to fetch, and pay accordingly** — Name, address,
  location, and category are always included at Google's cheaper
  "Essentials" rate. Phone, website, rating & reviews, opening hours, and
  price level are optional — skip all of them to stay on the Essentials
  rate, or include any of them to unlock full contact data at Google's
  higher "Enterprise" rate. The cost preview updates live as you toggle
  fields, before you spend anything.
- **Folders** — every search becomes its own folder of leads. Pause,
  resume, cancel mid-run, re-run later, retry failed enrichment (or retry
  all), and delete — all without leaving the page.
- **Enrichment**, best-effort from the business's own site: emails (with a
  free syntax + MX-record check, not full mailbox verification), 12 social
  platforms (Facebook, Instagram, LinkedIn, X, YouTube, TikTok, WhatsApp,
  Pinterest, Telegram, Threads, Snapchat, Discord), booking/menu links, a
  company description, a detected tech stack (WordPress, Shopify, Wix,
  Squarespace, Webflow, Next.js, GA/GTM/Meta Pixel, common chat widgets),
  and an SSL certificate check (validity + issuer) via a raw TLS
  handshake — no third-party API calls, no extra cost.
- **Message templates & outreach** — write reusable templates with
  placeholders (`[Name]`, `[Business Name]`, `[Address]`, `[Phone]`,
  `[Website]`, `[Category]`) that auto-fill per lead. Pin one as the
  default so it loads automatically the moment you open any lead. From
  there: copy the personalized message, or send it straight to WhatsApp
  with the text pre-filled (you still hit Send yourself inside WhatsApp —
  this app never sends anything automatically).
- **WhatsApp-aware, not WhatsApp-blind** — since not every scraped number
  is actually on WhatsApp, you can manually confirm or rule that out per
  lead; the icon and available actions (message vs. call) update
  accordingly, and you can filter leads by that status.
- **Lead management** — status pipeline (New/Contacted/Interested/
  Qualified/Won/Lost), tags, favourite, archive, assigned salesperson,
  a manually-entered contact name (for personalization), notes — all
  bulk-editable across a multi-select. Fuzzy duplicate detection (by
  phone/website domain) with one-click merge, separate from the exact
  Place-ID dedup that happens automatically during discovery.
- **Filtering** — rating and review-count ranges, has-website / has-email /
  has-social / has-WhatsApp (Any/Yes/No), specific social platforms,
  business status, lead status, business size estimate, favourite,
  archived — combine freely, with a live result count.
- **Import/export** — CSV/XLSX export honoring your current filters (no
  artificial row limit), and CSV/XLSX import with a preview step, deduped
  against your existing leads by Place ID, phone, or website domain.
- **Business size estimate** is a crude heuristic from Google review count
  only (small/medium/large/enterprise) — Google's API doesn't expose
  employee count or revenue, so treat it as a rough proxy, not fact.
- **Settings page** — paste your Google Places API key directly in the app
  (gear icon in the sidebar); no file editing required. Takes priority
  over an `.env` value if both are set.

### Deliberately not built

A few capabilities are either not obtainable from the official API, need a
paid third-party service, or conflict with this tool's compliant-scraping
design — flagged here rather than faked:

- **Claimed/verified business status, CID, owner name, years in business,
  amenities, service area** — Google's Places API doesn't expose these; no
  placeholder data is generated for them.
- **Automated "does this number have WhatsApp" checking** — there's no free,
  official way to check this for arbitrary numbers; see the WhatsApp
  section above for the manual-confirmation approach this app uses instead.
- **WHOIS / DNS / domain age / hosting provider / PageSpeed** — WHOIS/DNS
  hit rate-limited third-party servers and PageSpeed needs its own Google
  API quota. Only the free SSL certificate check is included.
- **True email/phone verification** (SMTP probing or a paid API) — only
  free syntax + MX-record validation is done, which confirms the domain
  can receive mail, not that the specific mailbox exists.
- **Proxy rotation / CAPTCHA solving** — this is specifically for evading
  bot detection, which conflicts with the robots.txt-respecting,
  rate-limited crawling this tool is built around. Not implemented on
  purpose.

## Legal / compliance note

- This app only calls **Google's official Places API and Geocoding API**
  under their Terms of Service — it does not scrape Google Maps pages.
- Enrichment only reads **publicly available pages on a business's own
  website** — the same information a human visitor would see.
- **You are responsible for how you use the emails, phone numbers, and
  contact details this tool collects.** Outbound outreach is subject to
  applicable law in your jurisdiction — notably **GDPR** (EU/UK contacts)
  and **CAN-SPAM** (commercial email in/to the US), plus equivalents
  elsewhere (e.g. CASL in Canada). At minimum: honor opt-outs, identify
  yourself, and don't mislead recipients about why you're contacting them.
- **WhatsApp outreach at volume risks your account.** Messaging many
  first-time contacts with similar templated text — even sent manually,
  one click at a time — matches WhatsApp's own spam-detection pattern and
  can get an account restricted. Pace yourself; this isn't a bulk-messaging
  tool.

## Tech stack

- Next.js 14 (App Router) + TypeScript, TailwindCSS, hand-rolled
  shadcn/ui-style components (Radix primitives)
- Prisma ORM — **SQLite by default** for zero-setup local dev (see "Using
  Postgres instead" below)
- TanStack Query + TanStack Table
- `exceljs` (XLSX) + a small built-in CSV writer for export; `papaparse` +
  `exceljs` for import parsing
- A lightweight **in-process job runner** (no Redis/BullMQ) for search
  discovery and website enrichment — see "Background jobs" below for its
  one important limitation

## Getting started

### Prerequisites

- **Node.js 18.18+** (20 LTS recommended) and npm
- A **Google Cloud** account with billing enabled (Places API (New) and
  Geocoding API are paid, though usage for a small tool is cheap — see
  "Cost estimation" below)

### 1. Get a Google Cloud API key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and
   create (or select) a project.
2. Enable these two APIs for the project (**APIs & Services → Library**):
   - **Places API (New)**
   - **Geocoding API**
3. Create an API key (**APIs & Services → Credentials → Create
   Credentials → API key**).
4. Restrict the key (recommended): under "API restrictions," limit it to
   just the two APIs above. Since this app calls Google from your own
   server (not a browser), you generally do **not** need HTTP referrer
   restrictions — an IP restriction or no restriction (for local dev) is
   fine.
5. Confirm billing is enabled on the project — these are paid APIs (see
   "Cost estimation" below for what that actually costs).

### 2. Clone and install

```bash
git clone https://github.com/Thaakurx/leadfinder.git
cd leadfinder
npm install
```

`npm install` also runs `prisma generate` automatically and creates a local
SQLite database — no separate database server to install.

### 3. Add your API key

You can do this either way:

- **In the app (recommended)** — start the app (step 4 below), click the
  gear icon next to "LeadFinder" in the sidebar, and paste your key into
  Settings. Stored in the local database; no file editing needed, and no
  restart required.
- **Via `.env.local`** — copy `.env.example` to `.env.local` and fill in
  your key:
  ```bash
  cp .env.example .env.local
  ```
  ```bash
  GOOGLE_PLACES_API_KEY=your-key-here
  ```
  Useful for headless/server setups. A key saved via Settings takes
  priority over this if both are set.

`DATABASE_URL` already defaults to a local SQLite file and needs no changes
for local dev.

### 4. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If you skipped step 3,
add your key from the Settings gear icon now.

## Using LeadFinder

1. **Run a search** — in the "New search" panel, pick Category or Keyword
   mode, enter what you're looking for and where, set a radius (≤50 km)
   and a max-leads cap, and choose which optional fields to fetch (this
   controls cost — see "Feature overview" above). Preview the estimated
   cost, then run it. The panel auto-collapses once a search starts so the
   results have room to breathe; click it (or the arrow) to expand it again
   for your next search. The whole sidebar can also be hidden via the panel
   icon next to the app title, for a full-width view.
2. **Browse folders** — each search is its own folder card, showing status,
   lead count, duplicates skipped, and failures at a glance. Click a folder
   to see its leads, or "All Leads" to browse everything.
3. **Work a lead** — click any row to open its detail drawer: contact
   info (with one-click WhatsApp / call / copy-number), enrichment results,
   a message composer, and lead-management fields (status, tags, notes,
   assigned-to, a manually-entered contact name for personalization).
4. **Set up templates** — click "Templates" in the toolbar to write
   reusable outreach messages. Pin one as default so it's ready the moment
   you open a lead.
5. **Filter, export, import** — use the Filters popover to narrow the table
   by rating, contact info available, status, and more; Export respects
   whatever filters are active; Import brings in a CSV/XLSX with a preview
   and automatic dedup.

## Using Postgres instead of SQLite

1. In `prisma/schema.prisma`, change the datasource `provider` from
   `"sqlite"` to `"postgresql"`.
2. Set `DATABASE_URL` in `.env` to your Postgres connection string.
3. Run `npm run db:push` again.

Note: SQLite doesn't support native enums or list columns, so status-like
fields (`status`, `enrichmentStatus`, `businessStatus`, `jobStatus`) are
plain validated strings, and array fields (`emails`, `category`,
`socialLinks`) are stored as JSON text. This works identically on Postgres,
so no data-shape changes are needed if you switch later.

## Background jobs (important if you ever deploy this)

Search discovery and website enrichment run as fire-and-forget async work
inside the same Node process that serves your HTTP requests (see
`lib/jobs/discovery.ts` and `lib/jobs/enrichment.ts`). This works because
`next dev` / `next start` is a long-running server — the background work
keeps running after the API response is sent.

**This does not work on serverless platforms like Vercel**, where a
function is frozen or killed shortly after it returns a response. If you
deploy there, swap the job runner for a real queue (e.g. BullMQ + Redis, or
a hosted queue) — the job functions themselves are already isolated in
`lib/jobs/` and don't need to change, just how they're invoked.

## Deploying publicly (e.g. Railway)

This needs a host that runs a persistent Node process (not a serverless
platform — see above). [Railway](https://railway.app) is a good fit: it
runs `next start` continuously and supports a persistent disk for the
SQLite file.

**There is no per-user login system.** Anyone with the URL has full
access — creating searches (spending your Google API budget) and
viewing/editing/deleting your leads — unless you set `APP_PASSWORD`
(see below), which gates the whole app behind one shared password.

1. Push this repo to your own GitHub account (already done if you
   forked/cloned it from a public source).
2. In Railway: **New Project → Deploy from GitHub repo**, pick this repo.
   It auto-detects Next.js and runs `npm install`, `npm run build`,
   `npm start`.
3. Add a **Volume**, mounted at `/data` — without this, the SQLite file
   lives on the container's ephemeral filesystem and gets wiped on every
   redeploy.
4. Set these environment variables in Railway's dashboard:
   - `DATABASE_URL=file:/data/dev.db` — points the database at the
     persistent volume.
   - `APP_PASSWORD=<a password you choose>` — required for any public
     deployment (see above).
   - `GOOGLE_PLACES_API_KEY` is optional here — you can instead set it
     from the in-app Settings page (gear icon) after deploying, no
     redeploy needed.
5. Deploy. `npm start` runs `prisma db push` first, which creates the
   SQLite schema on the fresh volume automatically.
6. Open the Railway-provided URL, log in with your `APP_PASSWORD`, and (if
   you skipped step 4's API key) add your Google Places API key via
   Settings.

## Cost estimation

Google's Places API (New) pricing depends on which field "SKU" tier
(Essentials/Enterprise) your request falls into, and changes over time. The
in-app cost preview (`lib/cost.ts`) uses a configurable **approximation** —
verify current pricing at
[mapsplatform.google.com/pricing](https://mapsplatform.google.com/pricing/)
and set `GOOGLE_PLACES_COST_PER_REQUEST_USD` /
`GOOGLE_PLACES_ESSENTIALS_COST_PER_REQUEST_USD` in `.env.local` to match
your actual rate if it matters for your budgeting.

Also note: **Nearby Search (New)** — used in Category mode — returns at
most 20 results per run with no pagination support in the New API, and
caps radius at 50 km. Keyword mode uses Text Search (New) instead, which
paginates up to your requested cap (also radius-capped at 50 km — a hard
Google API limit, not a choice this app makes).

## Enrichment tuning

Environment variables (optional, sensible defaults if unset):

- `ENRICHMENT_REQUESTS_PER_SECOND_PER_DOMAIN` (default `1`) — crawl rate
  limit per website domain.
- `ENRICHMENT_TIMEOUT_MS` (default `8000`) — per-page fetch timeout.
- `ENRICHMENT_CONCURRENCY` (default `5`) — max number of website crawls
  running in parallel across all domains.

## Project structure

```
app/                 Next.js App Router pages + API routes
app/login/            Password-gate login page (active only if APP_PASSWORD is set)
components/          UI components (search form, leads table, drawers, dialogs)
components/ui/       Hand-rolled shadcn/ui-style primitives (Radix + Tailwind)
lib/                 Core logic: Google Places/Geocoding client, cost estimator,
                      Prisma client, validation (zod), leads query builder,
                      export/import, serializers, shared types, settings, auth
lib/jobs/            In-process background job runner (discovery, enrichment, limiter, pause/cancel control)
lib/enrichment/      Website crawler: robots.txt check, HTML extraction (emails/social/tech
                      stack/booking-menu links), SSL check, syntax+MX email verification
lib/dedupe.ts        Shared phone/domain normalization used by import + duplicate detection
lib/duplicates.ts    Duplicate-group finder + merge logic
lib/message-template.ts  Placeholder substitution for outreach templates
middleware.ts        Optional shared-password gate (see "Deploying publicly")
hooks/               React Query hooks
prisma/              Prisma schema + local SQLite database file
```

## License

MIT — see [LICENSE](LICENSE).
