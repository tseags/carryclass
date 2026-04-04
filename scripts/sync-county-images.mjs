/**
 * Scans public/county-images for {slug}.{png|jpg|jpeg|webp} and writes
 * src/data/county-images-local.generated.ts
 *
 * If two files share a slug (e.g. sacramento.jpg + sacramento.png), preference is:
 *   png > jpg > jpeg > webp
 *
 * Run: node scripts/sync-county-images.mjs
 * (Also runs automatically before `next build` via package.json.)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const countyDir = path.join(root, "public", "county-images");
const outFile = path.join(root, "src", "data", "county-images-local.generated.ts");

/** Lower = preferred when multiple extensions exist for the same slug */
const EXT_PRIORITY = { ".png": 0, ".jpg": 1, ".jpeg": 2, ".webp": 3 };

function main() {
  let entries = [];
  try {
    entries = fs.readdirSync(countyDir, { withFileTypes: true });
  } catch {
    console.warn("[sync-county-images] public/county-images not found; writing empty map.");
  }

  /** @type {Map<string, { rel: string, prio: number }>} */
  const bySlug = new Map();

  for (const ent of entries) {
    if (!ent.isFile()) continue;
    const m = ent.name.match(/^(.+)\.(png|jpg|jpeg|webp)$/i);
    if (!m) continue;
    const slug = m[1].toLowerCase();
    const ext = "." + m[2].toLowerCase();
    const rel = `/county-images/${ent.name}`;
    const prio = EXT_PRIORITY[ext] ?? 99;

    const prev = bySlug.get(slug);
    if (!prev) {
      bySlug.set(slug, { rel, prio });
      continue;
    }
    if (prio < prev.prio) {
      bySlug.set(slug, { rel, prio });
    }
  }

  const sorted = [...bySlug.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const body = sorted
    .map(([slug, { rel }]) => `  "${slug}": "${rel}",`)
    .join("\n");

  const contents = `/**
 * AUTO-GENERATED — do not edit by hand.
 * Source: public/county-images/*.{png,jpg,jpeg,webp}
 * Regenerate: \`npm run sync:county-images\` (runs before build)
 */
export const LOCAL_COUNTY_IMAGES_FROM_FOLDER: Record<string, string> = {
${body}
};
`;

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, contents, "utf8");
  console.log(
    `[sync-county-images] Wrote ${sorted.length} mapping(s) → ${path.relative(root, outFile)}`
  );
}

main();
