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
        "3df1d4e8-fd9b-45e2-b3b5-cd3105d22e1f",
        "07cb90d4-6b0c-4cc9-9468-0b15a8737281",
        "b1b6d881-60b6-4a4c-b8a9-0697c03a5b17",
        "2dc9be00-444c-43b1-b110-04f411302d66",
        "0508b6ac-6960-4189-b7e1-fe07ee395e01",
        "083fd6c2-4b39-4fb7-806e-8612ee724281",
      ],
      priceInitial: 400,
      priceRenewal: 299,
      website: "https://www.safeinsight.net",
    },
  ],
  forceSeparate: [],
};
