import { ImageResponse } from "next/og";

// Site-wide social-share image (also used for Twitter). 1200×630 is the standard OG size.
export const alt = "World Cup 2026 Predictions — live odds, bracket and champion probabilities";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: "linear-gradient(135deg, #0a0f0b 0%, #0d1410 55%, #102417 100%)",
          color: "#f7faf8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 4, color: "#4ade80", fontWeight: 600 }}>
          MONTE CARLO FORECAST · 20,000 SIMULATIONS
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>
            World Cup 2026
          </div>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, color: "#4ade80" }}>
            Predictions
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 34, color: "#b6c2ba", lineHeight: 1.3 }}>
            Live group-winner odds, advancement, knockout bracket &amp; champion probability.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #2a3a30",
            paddingTop: 28,
            fontSize: 30,
          }}
        >
          <div style={{ display: "flex", color: "#8aa394" }}>worldcup2026predictions.app</div>
          <div style={{ display: "flex", color: "#4ade80", fontWeight: 600 }}>Updated live</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
