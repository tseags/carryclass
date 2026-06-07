/** Platform service fee as a fraction of class tuition (0.05 = 5%). Non-refundable per policy. */
export const PLATFORM_SERVICE_FEE_RATE = 0.05;

/** Display label for checkout UI and policy copy. */
export const PLATFORM_SERVICE_FEE_PERCENT_LABEL = "5%";

/** Platform fee in USD cents, rounded to the nearest cent. */
export function calculatePlatformServiceFeeCents(classAmountCents: number): number {
  if (!Number.isFinite(classAmountCents) || classAmountCents < 0) return 0;
  return Math.round(classAmountCents * PLATFORM_SERVICE_FEE_RATE);
}
