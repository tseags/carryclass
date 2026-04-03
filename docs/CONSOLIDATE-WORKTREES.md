# Consolidating Desktop + Git worktrees (without losing work)

## What you have

- **`/Users/ty/Desktop/ccw-directory`** — **main** checkout. This tree has the **most complete** app: new routes (`dashboard/`, `api/`, `vendors/.../book`, etc.), Prisma libs, maps, `public/css/app-overrides.css`, and many untracked assets.
- **`~/.cursor/worktrees/ccw-directory/*`** — **linked worktrees**: same Git repo, **different folders**. Some are **detached** at an **older** commit (`cd26539`); **`mkx`** is on branch **`county-stats-by-numbers`** at the **same commit as `main`** but its **working copy** differs (partial edits).

**Important:** `localhost` only shows the files in the folder where you run `npm run dev`. If you run dev from a worktree, you will **not** see Desktop-only files (and vice versa).

## Safe principles (do not delete needed files)

1. **Do not delete** untracked folders on Desktop (`src/app/api`, `prisma/`, `public/county-images/*.jpg`, etc.) until you have a **backup** (Time Machine, zip copy, or **git commit**).
2. Treat **Desktop as the source of truth** for “full site” going forward.
3. **Copy merges, not folder replaces:** bring *specific* changes **from** a worktree **into** Desktop (or merge Git branches), never replace the whole Desktop tree with a worktree unless you are sure.

## Step A — Backup (5 minutes)

On Desktop:

```bash
cd /Users/ty/Desktop/ccw-directory
git status
```

- Either **commit** work to `main` or a WIP branch, **or** copy the whole folder elsewhere (e.g. Desktop zip “ccw-directory-backup-YYYY-MM-DD”).

## Step B — See what differs (audit)

From the project root:

```bash
cd /Users/ty/Desktop/ccw-directory
npm run worktree:audit
```

(or `./scripts/worktree-audit.sh`)

This compares Desktop vs the `mkx` worktree. Output is printed **and** saved to **`worktree-audit.log`** in the project root. If the integrated terminal shows nothing, open **`worktree-audit.log`** in Cursor (same folder as `package.json`).

## Step C — Bring work **from mkx** into Desktop (only if you need those edits)

`mkx` has **modified** copies of some files that also exist on Desktop (e.g. county pages, `CountyStatsSection`, `VendorCard`). Desktop has **many files mkx does not have** — so **never** “sync by deleting Desktop.”

Pick one approach:

### Option 1 — Compare in Cursor (safest for a few files)

1. Open Desktop: **File → Open Folder → `/Users/ty/Desktop/ccw-directory`**
2. Open **`mkx`** in a **second window**: `/Users/ty/.cursor/worktrees/ccw-directory/mkx`
3. For each file you care about (e.g. `src/components/CountyStatsSection.tsx`), use **Compare with Selected** / diff and **copy only the hunks** you want into the Desktop file.

### Option 2 — Git: commit on `mkx`, then merge into `main`

From the `mkx` directory (only if you understand Git merges):

```bash
cd /Users/ty/.cursor/worktrees/ccw-directory/mkx
git add -A
git status   # review carefully
git commit -m "WIP: county stats / vendor card tweaks"
```

Then on Desktop:

```bash
cd /Users/ty/Desktop/ccw-directory
git merge county-stats-by-numbers
```

Resolve conflicts **in favor of Desktop** for large structural files unless you explicitly want the `mkx` version.

## Step D — Detached worktrees (`llj`, `nsy`, …)

They sit on an **older** commit with local edits. Treat them like **archives**:

- If you need a file from one, **copy that file** into Desktop (or commit on a throwaway branch and cherry-pick).
- Do **not** assume they are “newer” than Desktop — your audit shows Desktop is ahead in scope.

## Step E — After you are happy on Desktop

- Run dev **only** from Desktop: `./scripts/worktree-preview.sh dev 1`
- Optionally remove worktrees you no longer need (only after you have merged/copied what you need):

```bash
cd /Users/ty/Desktop/ccw-directory
git worktree remove /Users/ty/.cursor/worktrees/ccw-directory/mkx
```

(Do not manually delete those folders without `git worktree remove` — Git can get confused.)

## Quick reference

| Goal                         | Command / path                                      |
|-----------------------------|-----------------------------------------------------|
| List worktrees              | `git worktree list`                                 |
| Dev server from Desktop     | `./scripts/worktree-preview.sh dev 1`               |
| “Latest” marker files check | `./scripts/worktree-preview.sh signals`             |
| Diff audit Desktop vs mkx   | `npm run worktree:audit`                            |

## Post-merge state (consolidation run)

- **Backup branch:** `backup/pre-worktree-merge-20260403` (points at pre-merge `main` commit; create a new dated branch anytime before risky merges).
- **`main`** was fast-forwarded to include the **`county-stats-by-numbers` / mkx** snapshot commit, then **stash-pop** conflicts were resolved **in favor of Desktop** for `/vendors` (Webflow + map + DB), `/ca`, and `/ca/[county]` (Prisma + `VendorCardWebflow`), while keeping merged **county stats / timeline** components from the branch.
- **`county-stats-by-numbers`** is reset to match **`main`** so both tips align; use **Desktop** for ongoing work.
- **Optional:** remove a worktree when you no longer need it: `git worktree remove <path>` (see Step E above).
