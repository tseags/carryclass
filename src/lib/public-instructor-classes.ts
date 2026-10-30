import {
  cardsFromClassRows,
  feeRuleFromRow,
  type FeeRule,
  type PublicClassCard,
} from "@/lib/instructor-catalog";
import { getCheckoutFees, getClassTypes, getVendorProfileBySlug } from "@/lib/onboarding-db";

export type PublicInstructorCatalog = {
  ccw: PublicClassCard[];
  other: PublicClassCard[];
  fees: FeeRule[];
};

/**
 * Active classes and pass-through fees for a published instructor.
 * Null when this slug has no published onboarding profile — callers fall back
 * to the CCW price columns on the directory listing.
 */
export async function getOnboardingPublicCatalog(
  slug: string
): Promise<PublicInstructorCatalog | null> {
  const profile = await getVendorProfileBySlug(slug).catch(() => null);
  if (!profile?.is_published) return null;
  const [types, fees] = await Promise.all([
    getClassTypes(profile.id),
    getCheckoutFees(profile.id).catch(() => []),
  ]);
  const cards = cardsFromClassRows(types);
  return {
    ccw: cards.ccw,
    other: cards.other,
    fees: fees.filter((fee) => fee.is_active).map(feeRuleFromRow),
  };
}
