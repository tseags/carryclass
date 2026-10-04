/** Platform service fee as a fraction of class tuition (0.06 = 6%), inclusive of Stripe processing. Non-refundable per policy. */
export const PLATFORM_SERVICE_FEE_RATE = 0.06;

/** Display label for checkout UI and policy copy. */
export const PLATFORM_SERVICE_FEE_PERCENT_LABEL = "6%";

/** Platform fee in USD cents, rounded to the nearest cent. */
export function calculatePlatformServiceFeeCents(classAmountCents: number): number {
  if (!Number.isFinite(classAmountCents) || classAmountCents < 0) return 0;
  return Math.round(classAmountCents * PLATFORM_SERVICE_FEE_RATE);
}
