import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type GooglePrediction = {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

type GoogleAutocompleteResponse = {
  status: string;
  predictions?: GooglePrediction[];
  error_message?: string;
};

export type PlaceSuggestion = {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
};

/**
 * Server-side proxy for Google Places Autocomplete. Keeps GOOGLE_PLACES_API_KEY
 * off the client while returning lightweight address suggestions as the user types.
 */
export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get("input")?.trim() ?? "";
  if (input.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key?.trim()) {
    return NextResponse.json({ suggestions: [] });
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/autocomplete/json"
  );
  url.searchParams.set("input", input);
  url.searchParams.set("key", key);
  url.searchParams.set("components", "country:us");

  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = (await res.json()) as GoogleAutocompleteResponse;

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions: PlaceSuggestion[] = (data.predictions ?? []).map((p) => ({
      description: p.description,
      placeId: p.place_id,
      mainText: p.structured_formatting?.main_text ?? p.description,
      secondaryText: p.structured_formatting?.secondary_text ?? "",
    }));

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
