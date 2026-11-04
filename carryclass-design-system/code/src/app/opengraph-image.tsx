import { ImageResponse } from "next/og";

export const alt = "CarryClass — Find CCW classes and instructors in California";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 80px",
          background: "#141413",
          color: "#f2f0e8",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          <span>Carry</span>
          <span style={{ color: "#d56f49" }}>Class</span>
        </div>
        <p
          style={{
            marginTop: 36,
            fontSize: 40,
            fontWeight: 600,
            lineHeight: 1.25,
            maxWidth: 900,
            color: "#f2f0e8",
          }}
        >
          Find sheriff-approved CCW classes in California
        </p>
        <p
          style={{
            marginTop: 20,
            fontSize: 26,
            lineHeight: 1.4,
            maxWidth: 820,
            color: "#b0aea5",
          }}
        >
          Browse by county, compare instructors, and book training near you.
        </p>
      </div>
    ),
    { ...size }
  );
}
