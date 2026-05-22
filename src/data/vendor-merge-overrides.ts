/**
 * Edge-case overrides for the canonical vendor merge.
 *
 * The default grouping (website host → email → normalized name) handles the vast
 * majority of multi-county listings without manual intervention. Use this file
 * only when the heuristic gets it wrong:
 *
 *  - `forceMerge`: rows that should collapse into a single canonical vendor but
 *    don't share any of the standard keys (e.g. brand name changed mid-season,
 *    different sites per region).
 *  - `forceSeparate`: rows that share a key (e.g. franchisees on the same parent
 *    domain) but represent different businesses and must not merge.
 *
 * Keys can be either a row id (string) or any `website:`/`email:`/`name:` key
 * that `getRowGroupKey` would have produced for that row.
 *
 * Keep this file v1-empty unless data really requires it.
 */
import type { VendorMergeOverrides } from "@/lib/merge-canonical-vendors";

export const VENDOR_MERGE_OVERRIDES: VendorMergeOverrides = {
  forceMerge: [],
  forceSeparate: [],
};
