/**
 * Fetch place rating and reviews from Google Places API (Place Details).
 * Requires GOOGLE_PLACES_API_KEY and a valid place_id.
 * Billing: Place Details — Atmosphere (rating, user_ratings_total, reviews).
 */

export interface GoogleReview {
  authorName: string;
  rating: number;
  relativeTime: string;
  text: string;
  profilePhotoUrl?: string;
}

export interface GooglePlaceReviewsResult {
  rating: number;
  userRatingsTotal: number;
  reviews: GoogleReview[];
}

const FIELDS = "rating,user_ratings_total,reviews";

export async function getPlaceReviews(
  placeId: string
): Promise<GooglePlaceReviewsResult | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key?.trim()) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", FIELDS);
  url.searchParams.set("key", key);

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 }, // cache 1 hour
    });
    const data = await res.json();

    if (data.status !== "OK" || !data.result) return null;

    const r = data.result;
    const rating = typeof r.rating === "number" ? r.rating : 0;
    const userRatingsTotal = typeof r.user_ratings_total === "number" ? r.user_ratings_total : 0;
    const rawReviews = Array.isArray(r.reviews) ? r.reviews : [];

    const reviews: GoogleReview[] = rawReviews.slice(0, 5).map((rev: {
      author_name?: string;
      rating?: number;
      relative_time_description?: string;
      text?: string;
      profile_photo_url?: string;
    }) => ({
      authorName: rev.author_name ?? "",
      rating: typeof rev.rating === "number" ? rev.rating : 0,
      relativeTime: rev.relative_time_description ?? "",
      text: rev.text ?? "",
      profilePhotoUrl: rev.profile_photo_url,
    }));

    return { rating, userRatingsTotal, reviews };
  } catch {
    return null;
  }
}
