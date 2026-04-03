import { getCountyDisplayName } from "@/data/counties";
import { getCountyImageUrl } from "@/data/county-images";

import { CountyScrollClient } from "./CountyScrollClient";

// Top 20 most populous California counties (2020 Census), ordered high → low.
const COUNTY_SLUGS = [
  "los-angeles",
  "san-diego",
  "orange",
  "riverside",
  "san-bernardino",
  "santa-clara",
  "alameda",
  "sacramento",
  "contra-costa",
  "fresno",
  "kern",
  "san-francisco",
  "ventura",
  "san-joaquin",
  "san-mateo",
  "stanislaus",
  "sonoma",
  "tulare",
  "solano",
  "santa-barbara",
] as const;

export function CountyScrollSection() {
  const tiles = COUNTY_SLUGS.map((slug) => ({
    slug,
    displayName: getCountyDisplayName(slug),
    url: getCountyImageUrl(slug) ?? "",
  }));

  return <CountyScrollClient tiles={tiles} />;
}
