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
- **Sign Creator** — replaces manually building sponsor signs in InDesign.
  Upload a blank sign PDF for each physical size you use (e.g. small/large),
  position a logo and text placeholder once per size, then upload an
  event's sign list (an .xlsx/.csv with **Sponsorship**, **Company**, and
  **Size** columns) to generate every sign automatically — pulling each
  company's logo from the same Logo Library used for sponsor walls. Rows
  are matched by company name and by size label; anything that doesn't
  match (unknown company, unrecognized size) is still created and flagged
  "needs attention" so it's easy to find and fix. Download everything as a
  `.zip`, or edit and re-download any sign individually.

## Deploying to Vercel

1. Import this GitHub repo into a new Vercel project.
2. In the project's **Storage** tab, create a **Postgres** database and a
   **Blob** store, and link both to the project. Vercel auto-injects the
   connection env vars (`DATABASE_URL` and `BLOB_READ_WRITE_TOKEN`) into
   the deployment — if your Postgres integration names the var something
   other than `DATABASE_URL`, add a `DATABASE_URL` env var pointing at the
   same connection string.
3. Deploy. The build runs `prisma migrate deploy` automatically, so the
   database schema is created/updated on every deploy — no manual step
   needed.
4. Push to `main` (or whichever branch is connected) to trigger a new
   deploy at any time.

## Local development

```bash
npm install
cp .env.example .env
# Point DATABASE_URL at a real Postgres instance (local or hosted), and
# set BLOB_READ_WRITE_TOKEN — easiest is `vercel env pull .env` once the
# project is linked, which pulls both automatically.
npm run db:migrate   # applies prisma/migrations to your database
npm run dev
```

Visit http://localhost:3000.

## Tech notes

- Next.js (App Router) + TypeScript + Tailwind.
- **Postgres via Prisma** for data, **Vercel Blob** for logo files. Both are
  required — Vercel's serverless functions have a read-only, ephemeral
  filesystem, so SQLite files or local disk writes don't survive between
  requests/deploys there.
- Uploaded/imported logos are normalized to PNG (via `sharp`) before being
  uploaded to Blob storage; `Company.logoPath` / `Event.logoPath` store the
  resulting public Blob URL directly.
- The sponsor image itself is composited server-side with `@napi-rs/canvas`
  (`lib/render.ts`). Fonts are bundled under `assets/fonts` so rendering
  looks the same regardless of what's installed on the host.
- Tier layout (columns per row, logo size) is defined in `lib/tiers.ts`.
- Schema changes: run `npm run db:migrate` locally to create a new
  migration under `prisma/migrations/` and commit it — Vercel applies it
  automatically on the next deploy via `prisma migrate deploy`.
- Sign PDFs are generated with `pdf-lib` (`lib/signPdf.ts`), drawing text and
  a logo directly into the uploaded blank template — no headless browser or
  native PDF-rasterizing dependency involved. Sign lists are parsed with
  `xlsx` (`lib/excel.ts`). Both the blank templates and the generated signs
  are stored in Vercel Blob, same as logos.
- The template editor overlays draggable/resizable boxes on top of the
  browser's native PDF viewer (`components/PdfBoxEditor.tsx`) rather than
  rendering the PDF to canvas — positions are approximate previews; check a
  generated sign to fine-tune.
