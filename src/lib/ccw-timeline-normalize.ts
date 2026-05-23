import { CALIFORNIA_COUNTIES, COUNTY_DISPLAY_NAMES } from "@/data/counties";

/**
 * Pure helpers for normalizing imported (and form-submitted) CCW timeline reports.
 * Kept free of IO / Prisma so it can be unit-tested.
 */

export type CcwTimelineProcess = "initial" | "renewal" | "modification";

const COUNTY_SLUGS = new Set<string>(CALIFORNIA_COUNTIES as readonly string[]);

const DISPLAY_NAME_TO_SLUG: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [slug, display] of Object.entries(COUNTY_DISPLAY_NAMES)) {
    map[display.toLowerCase()] = slug;
  }
  return map;
})();

/**
 * Maps agency abbreviations + ad-hoc city/county phrases used in Reddit-style
 * timeline reports to canonical county slugs.
 *
 * Keys MUST be lowercase. Matching is whole-word (word boundary), case-insensitive.
 */
const AGENCY_TO_COUNTY: Array<[RegExp, string]> = [
  // Los Angeles agencies + cities
  [/\blasd\b/, "los-angeles"],
  [/\blapd\b/, "los-angeles"],
  [/\bla\s*(county|sheriff)/, "los-angeles"],
  [/\blos\s*angeles\b/, "los-angeles"],
  [/\bglendale\b/, "los-angeles"],
  [/\bpasadena\b/, "los-angeles"],
  [/\blong\s*beach\b/, "los-angeles"],
  [/\btorrance\b/, "los-angeles"],
  [/\bburbank\b/, "los-angeles"],
  [/\bsanta\s*monica\b/, "los-angeles"],
  [/\bbeverly\s*hills\b/, "los-angeles"],
  [/\binglewood\b/, "los-angeles"],
  [/\bculver\s*city\b/, "los-angeles"],
  [/\bsanta\s*clarita\b/, "los-angeles"],
  [/\bel\s*segundo\b/, "los-angeles"],

  // Bay Area
  [/\bsfpd\b/, "san-francisco"],
  [/\bsan\s*francisco\b/, "san-francisco"],
  [/\bacso\b/, "alameda"],
  [/\balameda\b/, "alameda"],
  [/\bsan\s*leandro\b/, "alameda"],
  [/\boakland\b/, "alameda"],
  [/\bfremont\b/, "alameda"],
  [/\bccso\b/, "contra-costa"],
  [/\bcontra\s*costa\b/, "contra-costa"],
  [/\bsmcso\b/, "san-mateo"],
  [/\bsan\s*mateo\b/, "san-mateo"],
  [/\bscso\b/, "santa-clara"],
  [/\bsanta\s*clara\b/, "santa-clara"],
  [/\bsan\s*jose\b/, "santa-clara"],
  [/\bmarin\b/, "marin"],
  [/\bsanta\s*cruz\b/, "santa-cruz"],
  [/\bnapa\b/, "napa"],
  [/\bsolano\b/, "solano"],
  [/\bsonoma\b/, "sonoma"],

  // Southern CA
  [/\bocsd\b/, "orange"],
  [/\bocso\b/, "orange"],
  [/\borange\s*(county|co\.?)\b/, "orange"],
  [/\borange\b/, "orange"],
  [/\boc\s*(?:county|co\.?|ccw|sheriff)\b/, "orange"],
  [/\bsdso\b/, "san-diego"],
  [/\bsdsd\b/, "san-diego"],
  [/\bsan\s*diego\b/, "san-diego"],
  [/\bsd\s*(?:county|co\.?)\b/, "san-diego"],
  [/\brso\b/, "riverside"],
  [/\briverside\b/, "riverside"],
  [/\brivco\b/, "riverside"],
  [/\bsbcsd\b/, "san-bernardino"],
  [/\bsbso\b/, "san-bernardino"],
  [/\bsan\s*bernardino\b/, "san-bernardino"],
  [/\bventura\b/, "ventura"],
  [/\bsanta\s*barbara\b/, "santa-barbara"],
  [/\bsan\s*luis\s*obispo\b/, "san-luis-obispo"],
  [/\bslo\b/, "san-luis-obispo"],
  [/\bkern\b/, "kern"],
  [/\bbakersfield\b/, "kern"],
  [/\bimperial\b/, "imperial"],

  // Central Valley / North
  [/\bsac(?:ramento)?\s*(county|co\.?|sheriff|sso)?\b/, "sacramento"],
  [/\bsacramento\b/, "sacramento"],
  [/\bsjcsd\b/, "san-joaquin"],
  [/\bsjso\b/, "san-joaquin"],
  [/\bsan\s*joaquin\b/, "san-joaquin"],
  [/\bstanislaus\b/, "stanislaus"],
  [/\bmodesto\b/, "stanislaus"],
  [/\bmerced\b/, "merced"],
  [/\bfresno\b/, "fresno"],
  [/\bmadera\b/, "madera"],
  [/\btulare\b/, "tulare"],
  [/\bkings\b/, "kings"],
  [/\bmonterey\b/, "monterey"],
  [/\bsan\s*benito\b/, "san-benito"],
  [/\byolo\b/, "yolo"],
  [/\byuba\b/, "yuba"],
  [/\bsutter\b/, "sutter"],
  [/\bplacer\b/, "placer"],
  [/\bel\s*dorado\b/, "el-dorado"],
  [/\bnevada\s*(county|co\.?)\b/, "nevada"],
  [/\bbutte\b/, "butte"],
  [/\bshasta\b/, "shasta"],
  [/\bredding\b/, "shasta"],
  [/\btehama\b/, "tehama"],
  [/\bmendocino\b/, "mendocino"],
  [/\bhumboldt\b/, "humboldt"],
  [/\bdel\s*norte\b/, "del-norte"],
  [/\blassen\b/, "lassen"],
  [/\bsiskiyou\b/, "siskiyou"],
  [/\bmodoc\b/, "modoc"],
  [/\bplumas\b/, "plumas"],
  [/\btrinity\b/, "trinity"],
  [/\bglenn\b/, "glenn"],
  [/\bcolusa\b/, "colusa"],
  [/\blake\s*county\b/, "lake"],
  [/\bcalaveras\b/, "calaveras"],
  [/\bamador\b/, "amador"],
  [/\btuolumne\b/, "tuolumne"],
  [/\bmariposa\b/, "mariposa"],
  [/\bmono\b/, "mono"],
  [/\binyo\b/, "inyo"],
  [/\balpine\b/, "alpine"],
  [/\bsierra\b/, "sierra"],
];

/**
 * Resolve a free-text county/agency mention (e.g. "LASD", "Sac County", "Orange")
 * to a canonical California county slug. Returns null if no confident match.
 */
export function normalizeCountyToSlug(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned) return null;

  if (COUNTY_SLUGS.has(cleaned)) return cleaned;

  const withoutSuffix = cleaned.replace(/\s+county\s*$/i, "").trim();
  if (COUNTY_SLUGS.has(withoutSuffix)) return withoutSuffix;
  if (DISPLAY_NAME_TO_SLUG[withoutSuffix]) return DISPLAY_NAME_TO_SLUG[withoutSuffix];

  const hyphenated = cleaned.replace(/\s+/g, "-");
  if (COUNTY_SLUGS.has(hyphenated)) return hyphenated;

  // Substring agency/city/county scan.
  for (const [pattern, slug] of AGENCY_TO_COUNTY) {
    if (pattern.test(cleaned)) return slug;
  }

  return null;
}

/** Inspect title + body, return county slug + confidence (0..1). */
export function detectCountyFromReport(
  title: string,
  body: string
): { slug: string | null; confidence: number; matches: string[] } {
  const matches: string[] = [];
  const titleHit = normalizeCountyToSlug(title);
  if (titleHit) {
    matches.push(`title:${titleHit}`);
  }

  // Scan body for additional agency hits.
  const lower = body.toLowerCase();
  for (const [pattern, slug] of AGENCY_TO_COUNTY) {
    if (pattern.test(lower)) matches.push(`body:${slug}`);
  }

  if (!titleHit && matches.length === 0) {
    return { slug: null, confidence: 0, matches };
  }

  if (titleHit) {
    // High confidence when title alone identifies the county.
    const supportingBody = matches.some((m) => m === `body:${titleHit}`);
    return { slug: titleHit, confidence: supportingBody ? 0.95 : 0.85, matches };
  }

  // Title didn't match; rely on body. Pick the most-cited body slug.
  const tally = new Map<string, number>();
  for (const m of matches) {
    const slug = m.split(":")[1];
    tally.set(slug, (tally.get(slug) ?? 0) + 1);
  }
  let best: { slug: string; count: number } | null = null;
  for (const [slug, count] of tally) {
    if (!best || count > best.count) best = { slug, count };
  }
  if (!best) return { slug: null, confidence: 0, matches };
  return { slug: best.slug, confidence: 0.55, matches };
}

const RENEWAL_HINTS = [
  /\brenewal\b/i,
  /\brenew(ing|ed)?\b/i,
  /\b8[\s-]?h(?:our|r)\b/i,
];

const MODIFICATION_HINTS = [
  /\bmodif(?:y|ication|ied|ying)\b/i,
  /\badd[\s-]?(?:a[\s-]?)?gun\b/i,
  /\badd\/remove\s+firearm/i,
  /\badd\s+(?:a\s+|another\s+|new\s+)?firearm/i,
  /\bremove\s+(?:a\s+)?firearm/i,
];

/**
 * Classify the process type. Modification is checked before renewal because
 * some modify-after-renewal posts mention both.
 */
export function classifyProcess(title: string, body: string): CcwTimelineProcess {
  const haystack = `${title}\n${body}`;
  if (MODIFICATION_HINTS.some((re) => re.test(haystack))) return "modification";
  if (RENEWAL_HINTS.some((re) => re.test(haystack))) return "renewal";
  return "initial";
}

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

/** Normalize a 2 or 4 digit year. 2-digit years assume 2000s (24 -> 2024). */
function normalizeYear(raw: string, fallback: number): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  if (n >= 1900 && n <= 2100) return n;
  if (n < 100) return 2000 + n;
  return fallback;
}

export type ParsedDate = { date: Date; iso: string; raw: string; index: number };

/**
 * Extract all date-like strings from text in document order. Supports:
 *   - 12/05/2025, 12/5/26, 4/19/26
 *   - 2025-12-05
 *   - December 5, 2025 / Dec. 5 2025 / Dec 5
 *   - "May 3" (when surrounding context implies a year)
 *
 * The `fallbackYear` is used for month-name dates that omit a year.
 */
export function extractDates(text: string, fallbackYear?: number): ParsedDate[] {
  const out: ParsedDate[] = [];
  if (!text) return out;
  const year = fallbackYear ?? new Date().getFullYear();

  // 1) M/D/Y or M/D
  const slashRe = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g;
  let m: RegExpExecArray | null;
  while ((m = slashRe.exec(text)) !== null) {
    const month = Number.parseInt(m[1], 10) - 1;
    const day = Number.parseInt(m[2], 10);
    if (month < 0 || month > 11) continue;
    if (day < 1 || day > 31) continue;
    const y = m[3] ? normalizeYear(m[3], year) : year;
    const date = new Date(Date.UTC(y, month, day));
    if (Number.isNaN(date.getTime())) continue;
    out.push({ date, iso: date.toISOString(), raw: m[0], index: m.index });
  }

  // 2) ISO YYYY-MM-DD
  const isoRe = /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g;
  while ((m = isoRe.exec(text)) !== null) {
    const y = Number.parseInt(m[1], 10);
    const month = Number.parseInt(m[2], 10) - 1;
    const day = Number.parseInt(m[3], 10);
    if (month < 0 || month > 11 || day < 1 || day > 31) continue;
    const date = new Date(Date.UTC(y, month, day));
    if (Number.isNaN(date.getTime())) continue;
    out.push({ date, iso: date.toISOString(), raw: m[0], index: m.index });
  }

  // 3) Month name, day [, year]
  const monthRe = new RegExp(
    `\\b(${Object.keys(MONTHS).join("|")})\\.?\\s+(\\d{1,2})(?:[,\\s]+(\\d{2,4}))?\\b`,
    "gi"
  );
  while ((m = monthRe.exec(text)) !== null) {
    const monthKey = m[1].toLowerCase();
    const month = MONTHS[monthKey];
    if (month === undefined) continue;
    const day = Number.parseInt(m[2], 10);
    if (day < 1 || day > 31) continue;
    const y = m[3] ? normalizeYear(m[3], year) : year;
    const date = new Date(Date.UTC(y, month, day));
    if (Number.isNaN(date.getTime())) continue;
    out.push({ date, iso: date.toISOString(), raw: m[0], index: m.index });
  }

  return out
    .sort((a, b) => a.index - b.index)
    .filter((entry, i, all) => {
      // Drop near-duplicates (same date appearing back-to-back in same context).
      if (i === 0) return true;
      const prev = all[i - 1];
      return !(prev.iso === entry.iso && entry.index - prev.index < 4);
    });
}

/**
 * Find an explicit duration callout like "Total time: 150 Days" or "176 days total".
 * Returns the integer day count if any, else null.
 */
export function extractExplicitDurationDays(text: string): number | null {
  if (!text) return null;
  const patterns = [
    /total\s*(?:time|wait)\s*[:\-]?\s*(\d{1,4})\s*days?/i,
    /(\d{1,4})\s*days?\s*total/i,
    /total[:\s]+(\d{1,4})\s*days?/i,
    /\b(\d{1,4})\s*days?\s*from\s+(?:application|submission|start)/i,
    /\bin\s*(\d{1,4})\s*days?\b/i,
    /\b~?(\d{1,4})[-\s]?day\s+turnaround\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const days = Number.parseInt(m[1], 10);
    if (Number.isFinite(days) && days > 0 && days < 2000) return days;
  }
  return null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export type DurationResult = {
  durationDays: number | null;
  dateStarted: Date | null;
  dateFinished: Date | null;
  source: "explicit" | "date-span" | "none";
  warnings: string[];
};

/**
 * Compute durationDays from text. Prefers explicit callouts, falls back to
 * date span (first dated event -> last dated event).
 */
export function computeDuration(
  body: string,
  opts: { titleDates?: ParsedDate[] } = {}
): DurationResult {
  const warnings: string[] = [];
  const explicit = extractExplicitDurationDays(body);
  const dates = extractDates(body);
  const all = (opts.titleDates ?? []).concat(dates).sort((a, b) => a.date.getTime() - b.date.getTime());

  const dateStarted = all[0]?.date ?? null;
  const dateFinished = all.length > 1 ? all[all.length - 1].date : null;

  if (explicit != null) {
    return {
      durationDays: explicit,
      dateStarted,
      dateFinished,
      source: "explicit",
      warnings,
    };
  }

  if (dateStarted && dateFinished) {
    const ms = dateFinished.getTime() - dateStarted.getTime();
    const days = Math.round(ms / DAY_MS);
    if (days <= 0) {
      warnings.push("date-span non-positive; ignoring");
      return { durationDays: null, dateStarted, dateFinished, source: "none", warnings };
    }
    if (days > 800) {
      warnings.push(`date-span unusually large (${days} days)`);
    }
    return {
      durationDays: days,
      dateStarted,
      dateFinished,
      source: "date-span",
      warnings,
    };
  }

  return {
    durationDays: null,
    dateStarted,
    dateFinished,
    source: "none",
    warnings,
  };
}

/**
 * Light cleanup of docx-extracted paragraphs:
 *   - Collapse exotic whitespace
 *   - Normalize bullet runs ("• A• B" -> "• A\n• B")
 *   - Insert a newline between a date and the next date in a glued line
 *     (e.g. "12/5/26: did X12/9/26: did Y" -> "12/5/26: did X\n12/9/26: did Y")
 */
export function cleanBody(raw: string): string {
  let s = raw.replace(/\r\n?/g, "\n");
  s = s.replace(/[\u00a0\u202f]/g, " ");
  s = s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');

  // Split glued bullets.
  s = s.replace(/([^\n])\s*•\s*/g, (_full, prev) => `${prev}\n• `);

  // Split glued date entries (MM/DD/YYYY or MM/DD/YY immediately after text).
  s = s.replace(
    /([a-z\.\!\?\)\]\,])\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\b/gi,
    (_m, prev, date) => `${prev}\n${date}`
  );

  // Split when a date (MM/DD/YY[YY]) is followed by a Capitalized word with no whitespace.
  s = s.replace(
    /(\d{1,2}\/\d{1,2}\/\d{2,4})([A-Z][a-z])/g,
    (_m, date, next) => `${date}\n${next}`
  );

  // Split month-name dates followed by a Capitalized word with no separator.
  // e.g. "May 25, 2025 - Training Completed, documents sentJuly 11, 2025 - ..."
  s = s.replace(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(,\s*\d{2,4})?([A-Z][a-z])/gi,
    (_m, mon, day, yr, next) => `${mon} ${day}${yr ?? ""}\n${next}`
  );

  // Collapse 3+ blank lines.
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

const MIN_BODY_LEN = 60;

export type Confidence = {
  score: number;
  highConfidence: boolean;
  warnings: string[];
};

/** Combines per-field signals into an overall confidence + auto-approval flag. */
export function scoreReport(args: {
  countyConfidence: number;
  process: CcwTimelineProcess;
  duration: DurationResult;
  body: string;
}): Confidence {
  const warnings: string[] = [];
  let score = 0;

  score += args.countyConfidence * 0.4;

  if (args.duration.durationDays != null) {
    score += args.duration.source === "explicit" ? 0.35 : 0.25;
  } else {
    warnings.push("no-duration");
  }

  warnings.push(...args.duration.warnings);

  const bodyTrimmed = args.body.trim();
  if (bodyTrimmed.length >= MIN_BODY_LEN) {
    score += 0.2;
  } else {
    warnings.push(`short-body (${bodyTrimmed.length} chars)`);
  }

  if (bodyTrimmed.length === 0) {
    warnings.push("empty-body");
  }

  // Require at least both a county and a duration for high confidence.
  // Reports with date-span warnings or implausible durations (> ~2 years) stay pending.
  const tooLong = args.duration.durationDays != null && args.duration.durationDays > 730;
  const highConfidence =
    args.countyConfidence >= 0.8 &&
    args.duration.durationDays != null &&
    bodyTrimmed.length >= MIN_BODY_LEN &&
    !tooLong &&
    !args.duration.warnings.some((w) => w.includes("non-positive") || w.includes("unusually large"));

  return {
    score: Math.min(1, Math.round(score * 100) / 100),
    highConfidence,
    warnings,
  };
}

/** Median of a finite non-empty number list. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}
