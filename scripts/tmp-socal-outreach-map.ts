/**
 * One-off: build a Leaflet pin map of directory instructors in
 * San Diego, Orange, and Riverside for in-person outreach.
 *
 * Usage: npx tsx scripts/tmp-socal-outreach-map.ts
 * Output: scripts/tmp-socal-outreach-map.html
 */

import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getCoordinatesForCity,
  getCoordinatesForCounty,
} from "../src/data/vendor-coordinates";
import { COUNTY_DISPLAY_NAMES, type CaliforniaCountySlug } from "../src/data/counties";

for (const file of [".env", ".env.development", ".env.local", ".env.development.local"]) {
  config({ path: resolve(process.cwd(), file), override: true, quiet: true });
}

function poolerSafeUrl(raw: string | undefined): string {
  if (!raw) return "";
  if (!/pooler\.supabase\.com:6543/.test(raw) || /pgbouncer=/.test(raw)) return raw;
  return `${raw}${raw.includes("?") ? "&" : "?"}pgbouncer=true`;
}

const COUNTIES = ["san-diego", "orange", "riverside"] as const;
const OUT_HTML = resolve(process.cwd(), "scripts/tmp-socal-outreach-map.html");
const OUT_JSON = resolve(process.cwd(), "scripts/tmp-socal-outreach-map.json");

type Row = {
  id: string | null;
  vendor_name: string | null;
  city: string | null;
  county: string | null;
  address: string | null;
  phone: string | null;
  website_url: string | null;
  email: string | null;
  accepts_bookings: boolean | null;
};

type Pin = {
  name: string;
  slug: string;
  county: string;
  countyLabel: string;
  city: string;
  address?: string;
  phone?: string;
  website?: string;
  email?: string;
  acceptsBookings: boolean;
  lat: number;
  lng: number;
  precision: "city" | "county";
  label: string;
};

const cityCache = new Map<string, [number, number] | null>();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function countyMatchValues(countySlug: string): string[] {
  const slug = countySlug.toLowerCase().trim();
  const display = COUNTY_DISPLAY_NAMES[slug as CaliforniaCountySlug];
  const values = new Set<string>([slug, slug.replace(/-/g, " ")]);
  if (display) {
    values.add(display);
    values.add(`${display} County`);
  }
  return [...values];
}

function normalizeCountySlug(raw: string | null | undefined): string {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return "";
  if ((COUNTIES as readonly string[]).includes(s)) return s;
  const noCounty = s.replace(/\s+county$/, "").trim();
  const dashed = noCounty.replace(/\s+/g, "-");
  if ((COUNTIES as readonly string[]).includes(dashed)) return dashed;
  for (const slug of COUNTIES) {
    const display = COUNTY_DISPLAY_NAMES[slug].toLowerCase();
    if (noCounty === display || s === `${display} county`) return slug;
  }
  return dashed;
}

async function geocodeCity(city: string): Promise<[number, number] | null> {
  const key = city.trim().toLowerCase();
  if (!key) return null;
  if (cityCache.has(key)) return cityCache.get(key) ?? null;

  const known = getCoordinatesForCity(city.trim());
  if (known) {
    cityCache.set(key, known);
    return known;
  }

  const query = `${city.trim()}, CA, USA`;
  try {
    await sleep(1100);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "ccw-directory-outreach-map/1.0 (internal)",
          Accept: "application/json",
        },
      }
    );
    if (!res.ok) {
      cityCache.set(key, null);
      return null;
    }
    const payload = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const first = payload[0];
    const lat = first?.lat ? Number.parseFloat(first.lat) : NaN;
    const lng = first?.lon ? Number.parseFloat(first.lon) : NaN;
    const value: [number, number] | null =
      Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
    cityCache.set(key, value);
    return value;
  } catch {
    cityCache.set(key, null);
    return null;
  }
}

function jitter(seed: string, magnitude = 0.012): [number, number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const a = ((h % 1000) / 1000 - 0.5) * 2 * magnitude;
  const b = ((((h / 1000) | 0) % 1000) / 1000 - 0.5) * 2 * magnitude;
  return [a, b];
}

function buildHtml(pins: Pin[]): string {
  const byCounty = Object.fromEntries(
    COUNTIES.map((c) => [c, pins.filter((p) => p.county === c).length])
  );
  const data = JSON.stringify(pins);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SoCal instructor outreach map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    :root { color-scheme: light; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f4f4f2; color: #1a1a1a; }
    header {
      display: flex; flex-wrap: wrap; gap: 12px 20px; align-items: baseline;
      justify-content: space-between; padding: 14px 18px; background: #fff;
      border-bottom: 1px solid #ddd;
    }
    h1 { font-size: 18px; font-weight: 650; margin: 0; }
    .meta { font-size: 13px; color: #555; }
    .legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 13px; }
    .swatch { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
    .layout { display: grid; grid-template-columns: minmax(280px, 340px) 1fr; height: calc(100vh - 58px); }
    #list { overflow: auto; background: #fff; border-right: 1px solid #ddd; }
    #map { width: 100%; height: 100%; }
    .filters { padding: 12px 14px; border-bottom: 1px solid #eee; display: flex; flex-wrap: wrap; gap: 8px; }
    .filters label { font-size: 12px; display: flex; align-items: center; gap: 5px; cursor: pointer; }
    .card { padding: 12px 14px; border-bottom: 1px solid #eee; cursor: pointer; }
    .card:hover, .card.active { background: #f0f7ff; }
    .card h2 { font-size: 14px; margin: 0 0 4px; font-weight: 600; }
    .card p { margin: 0; font-size: 12px; color: #555; line-height: 1.4; }
    .badge {
      display: inline-block; font-size: 10px; padding: 1px 6px; border-radius: 999px;
      background: #eee; color: #333; margin-left: 6px; vertical-align: middle;
    }
    .badge.book { background: #dcfce7; color: #166534; }
    a { color: #0b57d0; }
    @media (max-width: 800px) {
      .layout { grid-template-columns: 1fr; grid-template-rows: 40% 60%; }
      #list { border-right: none; border-bottom: 1px solid #ddd; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>SoCal instructor map</h1>
      <div class="meta">${pins.length} listings · San Diego ${byCounty["san-diego"] ?? 0} · Orange ${byCounty["orange"] ?? 0} · Riverside ${byCounty["riverside"] ?? 0} · pins ≈ city centers (slightly jittered)</div>
    </div>
    <div class="legend">
      <span><i class="swatch" style="background:#2563eb"></i>San Diego</span>
      <span><i class="swatch" style="background:#ea580c"></i>Orange</span>
      <span><i class="swatch" style="background:#16a34a"></i>Riverside</span>
    </div>
  </header>
  <div class="layout">
    <aside id="list">
      <div class="filters">
        <label><input type="checkbox" data-county="san-diego" checked /> San Diego</label>
        <label><input type="checkbox" data-county="orange" checked /> Orange</label>
        <label><input type="checkbox" data-county="riverside" checked /> Riverside</label>
      </div>
      <div id="cards"></div>
    </aside>
    <div id="map"></div>
  </div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const pins = ${data};
    const colors = { "san-diego": "#2563eb", orange: "#ea580c", riverside: "#16a34a" };
    const map = L.map("map").setView([33.5, -117.3], 9);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: "Tiles &copy; Esri",
    }).addTo(map);

    const markers = new Map();
    const layer = L.layerGroup().addTo(map);
    const cardsEl = document.getElementById("cards");
    const checks = [...document.querySelectorAll(".filters input")];

    function activeCounties() {
      return new Set(checks.filter((c) => c.checked).map((c) => c.dataset.county));
    }

    function escapeHtml(s) {
      return String(s ?? "").replace(/[&<>"']/g, (c) => ({
        "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
      })[c]);
    }
    function escapeAttr(s) { return escapeHtml(s).replace(/"/g, "&quot;"); }

    function popupHtml(p) {
      const mapsQ = encodeURIComponent([p.name, p.label, "CA"].filter(Boolean).join(", "));
      return [
        "<strong>" + escapeHtml(p.name) + "</strong>",
        escapeHtml(p.label),
        p.phone ? escapeHtml(p.phone) : "",
        p.website ? '<a href="' + escapeAttr(p.website) + '" target="_blank" rel="noopener">Website</a>' : "",
        '<a href="https://www.google.com/maps/search/?api=1&query=' + mapsQ + '" target="_blank" rel="noopener">Google Maps</a>',
        p.acceptsBookings ? "Book Now enabled" : "No Book Now",
        "Pin: " + p.precision + " level",
      ].filter(Boolean).join("<br/>");
    }

    function render() {
      const active = activeCounties();
      layer.clearLayers();
      markers.clear();
      cardsEl.innerHTML = "";
      const visible = pins.filter((p) => active.has(p.county));
      const bounds = [];
      for (const p of visible) {
        const color = colors[p.county] || "#333";
        const marker = L.circleMarker([p.lat, p.lng], {
          radius: 8,
          color: "#fff",
          weight: 1.5,
          fillColor: color,
          fillOpacity: 0.92,
        }).bindPopup(popupHtml(p));
        marker.addTo(layer);
        markers.set(p.slug, marker);
        bounds.push([p.lat, p.lng]);

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML =
          "<h2>" + escapeHtml(p.name) +
          (p.acceptsBookings ? '<span class="badge book">Book Now</span>' : "") +
          "</h2>" +
          "<p>" + escapeHtml(p.countyLabel) + " · " + escapeHtml(p.city || "—") + "</p>" +
          "<p>" + escapeHtml(p.label) + (p.phone ? " · " + escapeHtml(p.phone) : "") + "</p>";
        card.addEventListener("click", () => {
          document.querySelectorAll(".card").forEach((el) => el.classList.remove("active"));
          card.classList.add("active");
          map.setView([p.lat, p.lng], 12, { animate: true });
          marker.openPopup();
        });
        cardsEl.appendChild(card);
      }
      if (bounds.length) map.fitBounds(bounds, { padding: [40, 40] });
    }

    checks.forEach((c) => c.addEventListener("change", render));
    render();
  </script>
</body>
</html>`;
}

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: poolerSafeUrl(process.env.DATABASE_URL) } },
  });

  try {
    const matchValues = COUNTIES.flatMap((c) => countyMatchValues(c));
    const placeholders = matchValues.map((_, i) => `$${i + 1}`).join(", ");

    const rows = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT
         id::text AS id,
         vendor_name,
         city,
         county,
         address,
         phone,
         website_url,
         email,
         accepts_bookings
       FROM public.carry_class_vendor_data
       WHERE LOWER(TRIM(county)) IN (${placeholders})
         AND COALESCE(hidden_from_directory, false) = false
       ORDER BY county, vendor_name
       LIMIT 5000`,
      ...matchValues.map((v) => v.toLowerCase())
    );

    console.log(`Fetched ${rows.length} raw rows`);

    const pins: Pin[] = [];
    const seen = new Set<string>();

    for (const row of rows) {
      const name = (row.vendor_name ?? "").trim();
      if (!name) continue;
      const county = normalizeCountySlug(row.county);
      if (!(COUNTIES as readonly string[]).includes(county)) continue;
      const city = (row.city ?? "").trim();
      const key = `${name.toLowerCase()}|${county}|${city.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      let latlng = city ? await geocodeCity(city) : null;
      let precision: Pin["precision"] = "city";
      if (!latlng) {
        latlng = getCoordinatesForCounty(county);
        precision = "county";
      }
      if (!latlng) continue;

      const slugBase = slugify(`${name}-${county}`);
      const slug = slugBase || `vendor-${pins.length}`;
      const [jLat, jLng] = jitter(key, precision === "county" ? 0.04 : 0.01);
      const address = row.address?.trim() || undefined;
      const countyLabel = COUNTY_DISPLAY_NAMES[county as CaliforniaCountySlug] ?? county;

      pins.push({
        name,
        slug,
        county,
        countyLabel,
        city,
        address,
        phone: row.phone?.trim() || undefined,
        website: row.website_url?.trim() || undefined,
        email: row.email?.trim() || undefined,
        acceptsBookings: Boolean(row.accepts_bookings),
        lat: latlng[0] + jLat,
        lng: latlng[1] + jLng,
        precision,
        label: address ? `${address}${city ? `, ${city}` : ""}` : city || `${countyLabel} County`,
      });
    }

    pins.sort((a, b) => a.county.localeCompare(b.county) || a.name.localeCompare(b.name));

    for (const c of COUNTIES) {
      console.log(`  ${c}: ${pins.filter((p) => p.county === c).length}`);
    }

    writeFileSync(OUT_JSON, JSON.stringify(pins, null, 2));
    writeFileSync(OUT_HTML, buildHtml(pins));
    console.log(`Wrote ${pins.length} pins → ${OUT_HTML}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
