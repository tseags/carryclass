/**
 * Edge-case overrides for the canonical vendor merge.
 *
 * The default grouping (website host → email → normalized name) handles the vast
 * majority of multi-county listings without manual intervention. Use this file
 * only when the heuristic gets it wrong:
 *
 *  - `forceMerge`: rows that should collapse into a single canonical vendor but
 *    don't share any of the standard keys (e.g. brand name changed mid-season,
 *    different sites per region). Optional `priceInitial`, `priceRenewal`, and
 *    `website` pin display fields after the winner row is chosen.
 *  - `forceSeparate`: rows that share a key (e.g. franchisees on the same parent
 *    domain) but represent different businesses and must not merge.
 *
 * Keys can be either a row id (string) or any `website:`/`email:`/`name:` key
 * that `getRowGroupKey` would have produced for that row.
 */
import type { VendorMergeOverrides } from "@/lib/merge-canonical-vendors";

export const VENDOR_MERGE_OVERRIDES: VendorMergeOverrides = {
  forceMerge: [
    {
      label: "safe-insight",
      rowIds: [
        "d0720a54-1e01-4870-bea3-40760bd0958f",
        "721f9ccf-ce7f-4cdf-b572-1e93684d74fb",
        "861dc127-b1f1-4543-98ae-0bb736e51f45",
        "2a484a48-f701-43e4-be08-6bd899928cfb",
        "b0155c8f-efef-4dbb-84b3-9ff58a21c979",
        "3386d4d3-5a7f-4154-8d5a-9cfd4fb25437",
      ],
      priceInitial: 399,
      priceRenewal: 299,
      website: "https://www.safeinsight.net",
    },
  ],
  forceSeparate: [],
};
