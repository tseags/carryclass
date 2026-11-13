/** Human-readable label for a vendor's onboarding cancellation policy, or null when unset. */
export function cancellationPolicyLabel(
  policy: string | null,
  hours: number | null,
  refundPercent: number | null
): string | null {
  switch (policy) {
    case "none":
      return "No refunds — all sales are final";
    case "anytime":
      return "Full refund anytime before your first class day";
    case "full_hours_before":
      return `Full refund up to ${hours} hours before your first class day`;
    case "partial_hours_before":
      return `${refundPercent}% refund up to ${hours} hours before your first class day`;
    default:
      return null;
  }
}
