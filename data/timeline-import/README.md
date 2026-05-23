# CCW Timeline Import

This folder holds the parsed output of `CCW Timelines.docx` plus notes on how
to re-run the import / approval pipeline.

## Files

- `review.json` — current run output. Includes every parsed segment with the
  detected county, process, duration, confidence score, decision
  (`auto-approve` / `pending` / `skip`), and any parse warnings.
- `README.md` — this file.

Do **not** edit `review.json` by hand; it is regenerated from the source `.docx`
every time you run the import.

## End-to-end workflow

1. **Re-extract from the source `.docx`.**

   ```bash
   npm run import:ccw-timelines
   ```

   Reads `CCW Timelines.docx` (project root) and writes a fresh
   `data/timeline-import/review.json`. Prints a summary (counts by county,
   process, pending vs approved, top warnings).

   To import a different file:

   ```bash
   tsx scripts/import-ccw-timelines.ts path/to/other.docx
   ```

2. **Seed / upsert into the database.**

   ```bash
   set -a; source .env.local; set +a
   npm run seed:ccw-timelines
   ```

   Inserts new rows and updates existing ones (matched on `sourceRef`). For
   docx imports, `submittedAt` is set from the application completion date
   (`dateFinished`, else the last date found in the body, else `dateStarted`).
   User-form submissions keep `submittedAt` as the time they posted on the site.

   Status transitions are conservative:

   - PENDING + new high-confidence parse → APPROVED
   - APPROVED stays APPROVED (manual moderation wins)
   - REJECTED stays REJECTED

   Useful flags:

   - `--dry` — show counts only, no DB writes.
   - `--approved-only` — only upsert rows the importer flagged
     `auto-approve` (skip everything pending).

3. **Approve the remaining pending rows.**

   Two options:

   - **Prisma Studio**:

     ```bash
     set -a; source .env.local; set +a
     npm run db:studio
     ```

     Open the `CcwTimelineSubmission` table, filter `status = PENDING`,
     review the `body` + `parseWarnings`, and flip `status` to `APPROVED`
     (or `REJECTED`).

   - **One-off SQL** for known-good IDs:

     ```sql
     UPDATE "CcwTimelineSubmission"
     SET status = 'APPROVED', "reviewedAt" = now()
     WHERE id IN ('clxxxxxxxxx', 'clyyyyyyyyy');
     ```

## How the importer decides auto-approve vs pending

A row is auto-approved when **all** of these hold:

- County slug detected from the title (confidence ≥ 0.8).
- `durationDays` is computed (either an explicit "Total time: N days" call-out
  or first-date → last-date math).
- Body is at least 60 characters of substantive narrative.
- Duration is plausible (≤ 730 days, no "unusually large" warning).

Everything else stays `PENDING`. Common reasons a row lands in pending:

- `no-county-match` — couldn't map the title/body to a CA county slug
  (usually a new agency abbreviation; add it to `AGENCY_TO_COUNTY` in
  `src/lib/ccw-timeline-normalize.ts`).
- `no-duration` — neither an explicit duration nor two dated events were
  found in the body.
- `date-span unusually large (...)` — the post combines an old application
  story with a new modification/renewal. These need manual trimming of the
  body so the user-visible narrative matches the new process.

## Re-running after edits to parsing logic

If you tweak `src/lib/ccw-timeline-normalize.ts`:

```bash
npm test                       # ensure normalization unit tests still pass
npm run import:ccw-timelines   # re-parse the docx
npm run seed:ccw-timelines     # upsert; existing rows keep their moderation state
```

Because the seed script upserts on a content-hashed `sourceRef`, identical
input produces stable IDs and manual moderation choices survive re-imports.
