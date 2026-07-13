# Sponsoranator

A small web app for building the "sponsor wall" image that goes out in event
emails: a colored-border card with the event logo up top and sponsor logos
arranged in tiered rows below (Presenting/Gold at the top and largest,
Silver/Bronze/General below in tighter grids).

## What it does

- **Logo library** — save a company name + logo once (paste a URL or upload
  a file) and reuse it across any future event.
- **Events** — each event has its own name, logo, brand colors, and sponsor
  list. Edit an event at any time to add more sponsors as they come in.
- **Sponsors** — attach a company to an event and pick a level: Presenting,
  Gold, Silver, Bronze, or General (default). Presenting sponsors render
  largest at the top; lower tiers pack more logos per row further down.
- **Export** — download the composed PNG for the day's email, or export a
  `.zip` of every sponsor logo in the event (named after the company) for
  handing off to a designer.

## Getting started

```bash
npm install
cp .env.example .env      # sqlite db path, safe to leave as-is
npm run db:push           # creates the sqlite database
npm run dev
```

Visit http://localhost:3000.

## Tech notes

- Next.js (App Router) + TypeScript + Tailwind.
- SQLite via Prisma — zero external services required. Swap `DATABASE_URL`
  in `.env` for Postgres/MySQL later if you outgrow SQLite (update the
  `provider` in `prisma/schema.prisma` too).
- Uploaded/imported logos are normalized to PNG (via `sharp`) and stored in
  `public/uploads`. That folder is gitignored — back it up if you redeploy.
- The sponsor image itself is composited server-side with `@napi-rs/canvas`
  (`lib/render.ts`). Fonts are bundled under `assets/fonts` so rendering
  looks the same regardless of what's installed on the host.
- Tier layout (columns per row, logo size) is defined in `lib/tiers.ts`.
