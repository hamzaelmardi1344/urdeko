import { ImageResponse } from "next/og";

// On reste sur le runtime Node : ioredis et drivers Postgres importent des
// modules `node:*` incompatibles avec edge.
export const runtime = "nodejs";
export const alt = "UrdeKo — Design d'intérieur IA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          background:
            "linear-gradient(135deg, #f8f6f2 0%, #f0ebe1 60%, #e9dfce 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "linear-gradient(135deg, #ff7949, #a63300)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: -2,
            }}
          >
            U
          </div>
          <span style={{ fontSize: 36, fontWeight: 700, color: "#1a1410" }}>
            UrdeKo
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <h1
            style={{
              fontSize: 96,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -3,
              color: "#1a1410",
              margin: 0,
              maxWidth: 900,
            }}
          >
            Votre pièce, réinventée en 90 secondes.
          </h1>
          <p
            style={{
              fontSize: 36,
              color: "#5a4f46",
              margin: 0,
              maxWidth: 900,
            }}
          >
            Design d'intérieur IA — sélection de meubles et déco marocaine.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 24,
            color: "#7a6c5d",
          }}
        >
          <span>urdeko.app</span>
          <span>Casablanca · Rabat · Marrakech</span>
        </div>
      </div>
    ),
    size,
  );
}
