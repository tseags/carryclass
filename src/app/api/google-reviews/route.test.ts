import { beforeEach, describe, expect, it, vi } from "vitest";

const getPlaceReviewsResultMock = vi.fn();

vi.mock("@/lib/google-reviews", () => ({
  getPlaceReviewsResult: getPlaceReviewsResultMock,
}));

describe("google-reviews route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with review data for a valid place id", async () => {
    getPlaceReviewsResultMock.mockResolvedValue({
      ok: true,
      data: {
        rating: 4.8,
        userRatingsTotal: 22,
        reviews: [
          {
            authorName: "Alex",
            rating: 5,
            relativeTime: "2 weeks ago",
            text: "Great instructor.",
          },
        ],
      },
    });

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/google-reviews?placeId=abc123"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.rating).toBe(4.8);
    expect(body.data.userRatingsTotal).toBe(22);
  });

  it("returns 400 when no place id is provided", async () => {
    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/google-reviews"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("MISSING_PLACE_ID");
  });

  it("returns 502 when google API request fails", async () => {
    getPlaceReviewsResultMock.mockResolvedValue({
      ok: false,
      reason: "upstream_error",
    });

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/google-reviews?placeId=xyz789"));
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("GOOGLE_REVIEWS_UNAVAILABLE");
  });
});
