/**
 * County hero / tile images.
 * 1) Files in `public/county-images/{slug}.png|jpg|jpeg|webp` (see county-images-local.generated.ts)
 * 2) Unsplash fallbacks for counties without a local file
 *
 * Add or replace photos: drop files into `public/county-images/`, then run `npm run sync:county-images`
 * (or `npm run build`, which runs sync first).
 * @see https://unsplash.com/license
 */
import type { CaliforniaCountySlug } from "./counties";
import { LOCAL_COUNTY_IMAGES_FROM_FOLDER } from "./county-images-local.generated";

/** Unsplash CDN — hotlinking allowed per Unsplash guidelines; include auto=format for sizing. */
function unsplash(photoPath: string): string {
  return `https://images.unsplash.com/${photoPath}?auto=format&fit=crop&w=1400&q=82`;
}

/**
 * One Unsplash image per county (region-themed where it helps).
 * Photo IDs are from Unsplash — landscapes, cities, coast, desert, vineyards, Sierra.
 */
const UNSPLASH_BY_COUNTY: Record<CaliforniaCountySlug, string> = {
  alameda: unsplash("photo-1477959858617-67f85cf4f290"), // East Bay / urban
  alpine: unsplash("photo-1464822759023-fed622ff2c3b"), // High Sierra lake
  amador: unsplash("photo-1500382017468-9049fed7dbe0"), // Rolling foothills
  butte: unsplash("photo-1441974231531-c6227db76b6e"), // Forest / rural road
  calaveras: unsplash("photo-1472214103451-9374bd1c798e"), // Foothill meadow
  colusa: unsplash("photo-1500382017468-9049fed7dbe0"), // Valley agriculture
  "contra-costa": unsplash("photo-1480714378408-67cf0d13bc1b"), // Bay Area skyline
  "del-norte": unsplash("photo-1500530855697-b586d89ba3ee"), // North Coast mist / water
  "el-dorado": unsplash("photo-1506905925346-21bda4d32df4"), // Sierra peaks
  fresno: unsplash("photo-1500382017468-9049fed7dbe0"), // Central Valley fields
  glenn: unsplash("photo-1500382017468-9049fed7dbe0"),
  humboldt: unsplash("photo-1447752875215-b2761acb3c5d"), // Redwood forest
  imperial: unsplash("photo-1509316785289-025f5b846b35"), // Desert
  inyo: unsplash("photo-1516026672322-bc92d61a59d7"), // High desert / Joshua tree–like
  kern: unsplash("photo-1564419320461-6870880221ad"), // Arid hills / road
  kings: unsplash("photo-1500382017468-9049fed7dbe0"),
  lake: unsplash("photo-1474722883778-792e7990309f"), // Clear lake / hills vibe
  lassen: unsplash("photo-1464822759023-fed622ff2c3b"), // Mountain lake
  "los-angeles": unsplash("photo-1444723121867-7a241cacace9"), // LA (fallback if no local)
  madera: unsplash("photo-1500382017468-9049fed7dbe0"),
  marin: unsplash("photo-1501594907352-04cda38ebc29"), // Golden Gate / fog
  mariposa: unsplash("photo-1506905925346-21bda4d32df4"), // Yosemite area–style peaks
  mendocino: unsplash("photo-1426604966848-d7adac402bff"), // Coastal forest
  merced: unsplash("photo-1500382017468-9049fed7dbe0"),
  modoc: unsplash("photo-1470252649377-9ca8253a7ec8"), // Open range / sunrise
  mono: unsplash("photo-1499696591226-01d32c83d5c6"), // Eastern Sierra
  monterey: unsplash("photo-1505142468610-359e7d316be0"), // Big Sur–style coast
  napa: unsplash("photo-1474722883778-792e7990309f"), // Wine country hills
  nevada: unsplash("photo-1464822759023-fed622ff2c3b"), // Sierra foothills
  orange: unsplash("photo-1507525428034-b723cf961d3e"), // SoCal beach
  placer: unsplash("photo-1506905925346-21bda4d32df4"),
  plumas: unsplash("photo-1447752875215-b2761acb3c5d"),
  riverside: unsplash("photo-1514565131-fce9801e5f89"), // Palm desert
  sacramento: unsplash("photo-1470071459604-90b584ab7e0b"), // Capital / river city night
  "san-benito": unsplash("photo-1500382017468-9049fed7dbe0"),
  "san-bernardino": unsplash("photo-1509316785289-025f5b846b35"),
  "san-diego": unsplash("photo-1507525428034-b723cf961d3e"),
  "san-francisco": unsplash("photo-1501594907352-04cda38ebc29"),
  "san-joaquin": unsplash("photo-1480714378408-67cf0d13bc1b"),
  "san-luis-obispo": unsplash("photo-1505142468610-359e7d316be0"),
  "san-mateo": unsplash("photo-1486325212027-8081e485255e"), // Coastal / bridge
  "santa-barbara": unsplash("photo-1505142468610-359e7d316be0"),
  "santa-clara": unsplash("photo-1480714378408-67cf0d13bc1b"),
  "santa-cruz": unsplash("photo-1505142468610-359e7d316be0"),
  shasta: unsplash("photo-1464822759023-fed622ff2c3b"),
  sierra: unsplash("photo-1499696591226-01d32c83d5c6"),
  siskiyou: unsplash("photo-1470252649377-9ca8253a7ec8"),
  solano: unsplash("photo-1474722883778-792e7990309f"),
  sonoma: unsplash("photo-1474722883778-792e7990309f"),
  stanislaus: unsplash("photo-1500382017468-9049fed7dbe0"),
  sutter: unsplash("photo-1500382017468-9049fed7dbe0"),
  tehama: unsplash("photo-1441974231531-c6227db76b6e"),
  trinity: unsplash("photo-1426604966848-d7adac402bff"),
  tulare: unsplash("photo-1500382017468-9049fed7dbe0"),
  tuolumne: unsplash("photo-1506905925346-21bda4d32df4"),
  ventura: unsplash("photo-1507525428034-b723cf961d3e"),
  yolo: unsplash("photo-1470071459604-90b584ab7e0b"),
  yuba: unsplash("photo-1441974231531-c6227db76b6e"),
};

/**
 * Local files in `public/county-images/` always win over Unsplash (including prior site images).
 */
export function getCountyImageUrl(countySlug: string): string | undefined {
  const slug = countySlug as CaliforniaCountySlug;
  const local = LOCAL_COUNTY_IMAGES_FROM_FOLDER[slug];
  return (local && local.trim() !== "") ? local : UNSPLASH_BY_COUNTY[slug];
}
