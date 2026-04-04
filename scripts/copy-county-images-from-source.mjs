/**
 * Copies county photos from project root `County Images/` into `public/county-images/`
 * using URL-safe slugs. Clears `public/county-images` first so stale files (e.g. old .png)
 * don't win over new copies when syncing.
 *
 * Run: node scripts/copy-county-images-from-source.mjs
 * Then: node scripts/sync-county-images.mjs (or npm run build)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const sourceDir = path.join(root, "County Images");
const destDir = path.join(root, "public", "county-images");

/** When two files resolve to the same slug, lower wins (matches sync-county-images.mjs). */
const EXT_PRIORITY = { ".png": 0, ".jpg": 1, ".jpeg": 2, ".webp": 3 };

function extPriority(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return EXT_PRIORITY[ext] ?? 99;
}

/** Exact filename (as in folder) -> county slug. Fixes typos / odd names. */
const FILENAME_TO_SLUG = {
  "Almeda County.jpg": "alameda", // typo in source
  "Alpine County.jpg": "alpine",
  "Amador County.jpg": "amador",
  "Butte County.webp": "butte",
  "Del Norte County.jpg": "del-norte",
  "Fresno County.jpg": "fresno",
  "Glenn County.jpg": "glenn",
  "Humboldt County.jpg": "humboldt",
  "Inyo County.jpg": "inyo",
  "Kern County.jpg": "kern",
  "Kings County.jpg": "kings",
  "Lake County.jpg": "lake",
  "Lassen County.jpg": "lassen",
  "Madera County.webp": "madera",
  "Marin County.webp": "marin",
  "Mariposa County.jpg": "mariposa",
  "Mendocino County.jpg": "mendocino",
  "Merced County.jpeg": "merced",
  "Modoc County.jpg": "modoc",
  "Orange County.png": "orange",
  "San Diego - 2.png": "san-diego",
  "Santa Cruz County.jpg": "santa-cruz",
  /** Typo in source filename; same county as San Joaquin County.png */
  "San Jauquin.webp": "san-joaquin",
  /** Alternate photo; canonical slug is santa-clara (png usually wins on ext priority) */
  "santa-clara-county-neighborhood.jpg": "santa-clara",
  "Shasta County.webp": "shasta",
  "Sierra County.jpeg": "sierra",
  "Siskiyou county.jpg": "siskiyou",
  "Solano County.webp": "solano",
  "Sonoma county.jpg": "sonoma",
  "contra-costa-county.webp": "contra-costa",
  "los angeles.png": "los-angeles",
  "riverside.png": "riverside",
  "san-bernardino.jpg": "san-bernardino",
  /** Prefer sacramento-2.jpg over sacramento.jpg when both exist */
  "sacramento-2.jpg": "sacramento",
  "sacramento.jpg": "sacramento",
  /** Source file typo: "Count" instead of "County" */
  "Trinity Count.webp": "trinity",
};

function slugifyCountyName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function inferSlug(filename) {
  const base = path.basename(filename);
  if (FILENAME_TO_SLUG[base]) return FILENAME_TO_SLUG[base];

  const noExt = base.replace(/\.(png|jpe?g|webp)$/i, "");
  const m = noExt.match(/^(.+?)\s+county$/i);
  if (m) return slugifyCountyName(m[1]);

  return slugifyCountyName(noExt.replace(/\s+/g, " "));
}

function main() {
  if (!fs.existsSync(sourceDir)) {
    console.warn(`[copy-county-images] Missing folder: ${sourceDir}`);
    process.exit(0);
  }

  const hasSac2 = fs.existsSync(path.join(sourceDir, "sacramento-2.jpg"));

  fs.mkdirSync(path.dirname(destDir), { recursive: true });
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(sourceDir);
  /** slug -> { fullPath, base } */
  const bySlug = new Map();

  for (const name of entries) {
    if (name.startsWith(".")) continue;
    const full = path.join(sourceDir, name);
    let st;
    try {
      st = fs.statSync(full);
    } catch {
      continue;
    }
    if (!st.isFile()) continue;
    if (!/\.(png|jpe?g|webp)$/i.test(name)) continue;

    if (name === "sacramento.jpg" && hasSac2) continue;

    const slug = inferSlug(name);
    if (!slug) continue;

    const prev = bySlug.get(slug);
    if (!prev) {
      bySlug.set(slug, { fullPath: full, base: name });
    } else if (extPriority(full) < extPriority(prev.fullPath)) {
      bySlug.set(slug, { fullPath: full, base: name });
    }
  }

  if (!bySlug.has("sacramento") && fs.existsSync(path.join(sourceDir, "sacramento.jpg"))) {
    bySlug.set("sacramento", {
      fullPath: path.join(sourceDir, "sacramento.jpg"),
      base: "sacramento.jpg",
    });
  }

  let n = 0;
  for (const [slug, { fullPath, base }] of [...bySlug.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    const ext = path.extname(fullPath).toLowerCase();
    const destName = `${slug}${ext}`;
    const destPath = path.join(destDir, destName);
    fs.copyFileSync(fullPath, destPath);
    console.log(`  ${base} → public/county-images/${destName}`);
    n++;
  }

  console.log(`[copy-county-images] Copied ${n} file(s) into public/county-images/`);
}

main();
