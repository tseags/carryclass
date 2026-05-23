import { NextResponse } from "next/server";
import { geocodeWithNominatim } from "@/lib/nominatim-geocode";
import { resolveVendorLocation } from "@/lib/vendor-location";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const address = searchParams.get("address") ?? undefined;
  const city = searchParams.get("city") ?? undefined;
  const county = searchParams.get("county") ?? undefined;
  const state = searchParams.get("state") ?? undefined;

  const resolution = await resolveVendorLocation(
    {
      address,
      city,
      county,
      state,
    },
    { geocode: geocodeWithNominatim }
  );

  return NextResponse.json(resolution);
}
