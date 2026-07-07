/**
 * Pre-flight check before vendor listing writes.
 * Compares Supabase REST project ref vs DATABASE_URL project ref.
 *
 * Usage: npm run check:vendor-db-env
 */

import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

function supabaseProjectRef(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

function databaseProjectRef(): string | null {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname;
    const direct = host.match(/^db\.([^.]+)\.supabase\.co$/);
    if (direct) return direct[1];
    const pooler = raw.match(/postgres\.([^.]+):/);
    return pooler?.[1] ?? null;
  } catch {
    return null;
  }
}

const sbRef = supabaseProjectRef();
const dbRef = databaseProjectRef();
const fetchViaDb = process.env.VENDORS_FETCH_VIA_DATABASE === "1";

console.log("Vendor DB environment check");
console.log("─────────────────────────────");
console.log(`NEXT_PUBLIC_SUPABASE_URL ref: ${sbRef ?? "(not set or unparseable)"}`);
console.log(`DATABASE_URL ref:            ${dbRef ?? "(not set or unparseable)"}`);
console.log(`VENDORS_FETCH_VIA_DATABASE:  ${fetchViaDb ? "1 (reads via Postgres)" : "(unset — auto when refs differ)"}`);

let exitCode = 0;
let recommendation: string;

if (!dbRef) {
  exitCode = 1;
  recommendation =
    "DATABASE_URL is missing or not a Supabase Postgres URL. Set DATABASE_URL before vendor writes.";
} else if (!sbRef) {
  recommendation =
    "No Supabase REST URL — vendor reads/writes should use DATABASE_URL (Prisma/psql).";
} else if (sbRef === dbRef) {
  recommendation = "OK to use either path — REST and DATABASE_URL point at the same project.";
} else {
  exitCode = 1;
  recommendation =
    "Use DATABASE_URL for vendor writes; REST points at a different project.";
}

console.log(`Match:                         ${sbRef && dbRef ? (sbRef === dbRef ? "yes" : "NO — mismatch") : "n/a"}`);
console.log("");
console.log(`→ ${recommendation}`);

if (exitCode !== 0) {
  console.log("");
  console.log("Fix: write via `npx prisma db execute --file migrations/...` or psql $DATABASE_URL.");
  console.log("Set VENDORS_FETCH_VIA_DATABASE=1 in .env.local so local reads match writes.");
}

process.exit(exitCode);
