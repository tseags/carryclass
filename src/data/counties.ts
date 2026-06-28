// California's 58 counties - slugs for URL-friendly routing
export const CALIFORNIA_COUNTIES = [
  "alameda", "alpine", "amador", "butte", "calaveras", "colusa", "contra-costa",
  "del-norte", "el-dorado", "fresno", "glenn", "humboldt", "imperial", "inyo",
  "kern", "kings", "lake", "lassen", "los-angeles", "madera", "marin", "mariposa",
  "mendocino", "merced", "modoc", "mono", "monterey", "napa", "nevada",
  "orange", "placer", "plumas", "riverside", "sacramento", "san-benito",
  "san-bernardino", "san-diego", "san-francisco", "san-joaquin", "san-luis-obispo",
  "san-mateo", "santa-barbara", "santa-clara", "santa-cruz", "shasta", "sierra",
  "siskiyou", "solano", "sonoma", "stanislaus", "sutter", "tehama", "trinity",
  "tulare", "tuolumne", "ventura", "yolo", "yuba"
] as const;

export type CaliforniaCountySlug = (typeof CALIFORNIA_COUNTIES)[number];

export const COUNTY_DISPLAY_NAMES: Record<string, string> = {
  "alameda": "Alameda",
  "alpine": "Alpine",
  "amador": "Amador",
  "butte": "Butte",
  "calaveras": "Calaveras",
  "colusa": "Colusa",
  "contra-costa": "Contra Costa",
  "del-norte": "Del Norte",
  "el-dorado": "El Dorado",
  "fresno": "Fresno",
  "glenn": "Glenn",
  "humboldt": "Humboldt",
  "imperial": "Imperial",
  "inyo": "Inyo",
  "kern": "Kern",
  "kings": "Kings",
  "lake": "Lake",
  "lassen": "Lassen",
  "los-angeles": "Los Angeles",
  "madera": "Madera",
  "marin": "Marin",
  "mariposa": "Mariposa",
  "mendocino": "Mendocino",
  "merced": "Merced",
  "modoc": "Modoc",
  "mono": "Mono",
  "monterey": "Monterey",
  "napa": "Napa",
  "nevada": "Nevada",
  "orange": "Orange",
  "placer": "Placer",
  "plumas": "Plumas",
  "riverside": "Riverside",
  "sacramento": "Sacramento",
  "san-benito": "San Benito",
  "san-bernardino": "San Bernardino",
  "san-diego": "San Diego",
  "san-francisco": "San Francisco",
  "san-joaquin": "San Joaquin",
  "san-luis-obispo": "San Luis Obispo",
  "san-mateo": "San Mateo",
  "santa-barbara": "Santa Barbara",
  "santa-clara": "Santa Clara",
  "santa-cruz": "Santa Cruz",
  "shasta": "Shasta",
  "sierra": "Sierra",
  "siskiyou": "Siskiyou",
  "solano": "Solano",
  "sonoma": "Sonoma",
  "stanislaus": "Stanislaus",
  "sutter": "Sutter",
  "tehama": "Tehama",
  "trinity": "Trinity",
  "tulare": "Tulare",
  "tuolumne": "Tuolumne",
  "ventura": "Ventura",
  "yolo": "Yolo",
  "yuba": "Yuba",
};

export function getCountyDisplayName(slug: string): string {
  return COUNTY_DISPLAY_NAMES[slug] ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isValidCountySlug(slug: string): boolean {
  return CALIFORNIA_COUNTIES.includes(slug as CaliforniaCountySlug);
}

/**
 * Coerce an arbitrary request payload into a clean list of valid county slugs:
 * keeps only known California county slugs, dedupes, and preserves first-seen
 * order. Non-array / non-string inputs collapse to an empty array.
 */
export function normalizeCountiesServed(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of raw) {
    if (typeof value !== "string") continue;
    const slug = value.trim().toLowerCase();
    if (!isValidCountySlug(slug) || seen.has(slug)) continue;
    seen.add(slug);
    result.push(slug);
  }
  return result;
}
