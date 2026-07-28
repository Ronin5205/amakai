import { ImageResponse } from "next/og"

import { hero, siteConfig, trustStrip } from "@/lib/content"

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

/**
 * Satori has no `oklch()` support and no access to the stylesheet, so the
 * brand tokens are mirrored here as sRGB hex. These match the dark theme in
 * `app/globals.css`.
 */
const color = {
  background: "#090b0c",
  foreground: "#f4f7f7",
  muted: "#95a1a5",
  border: "#1f2628",
  hairline: "#141a1c",
  primary: "#00c951",
}

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: color.background,
          color: color.foreground,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 10,
            backgroundColor: color.primary,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -140,
            bottom: -180,
            width: 460,
            height: 460,
            border: `1px solid ${color.hairline}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -40,
            bottom: -80,
            width: 460,
            height: 460,
            border: `1px solid ${color.hairline}`,
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "64px 80px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <svg
                width="56"
                height="56"
                viewBox="0 0 64 64"
                fill="none"
                style={{ marginRight: 20 }}
              >
                <circle
                  cx="32"
                  cy="32"
                  r="29.75"
                  stroke={color.primary}
                  strokeWidth="2"
                  strokeDasharray="6.55 3.85"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="23.5"
                  stroke={color.primary}
                  strokeWidth="5"
                />
                <path
                  fill={color.primary}
                  fillRule="evenodd"
                  d="M32 12.5c1.15 0 2.15.55 2.7 1.5l14.2 24.5c.55.95.55 2.15 0 3.1-.55.95-1.55 1.5-2.7 1.5H17.8c-1.15 0-2.15-.55-2.7-1.5-.55-.95-.55-2.15 0-3.1l14.2-24.5c.55-.95 1.55-1.5 2.7-1.5ZM28.75 25.25a3.25 3.25 0 1 0 6.5 0 3.25 3.25 0 1 0-6.5 0ZM26.75 43.1v-7.35a5.25 5.25 0 0 1 10.5 0V43.1h-10.5Z"
                />
              </svg>
              <div style={{ fontSize: 34, letterSpacing: -0.5 }}>
                {siteConfig.name}
              </div>
            </div>

            <div
              style={{
                padding: "10px 18px",
                border: `1px solid ${color.border}`,
                color: color.muted,
                fontSize: 18,
                letterSpacing: 4,
              }}
            >
              {hero.eyebrow.toUpperCase()}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                maxWidth: 900,
                fontSize: 74,
                lineHeight: 1.08,
                letterSpacing: -2.5,
              }}
            >
              {hero.title}
            </div>
            <div
              style={{
                maxWidth: 820,
                marginTop: 28,
                color: color.muted,
                fontSize: 27,
                lineHeight: 1.4,
              }}
            >
              {siteConfig.tagline}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 28,
              borderTop: `1px solid ${color.border}`,
              color: color.muted,
              fontSize: 20,
            }}
          >
            <div>{trustStrip.items.join("   ·   ")}</div>
            <div style={{ color: color.foreground }}>
              {new URL(siteConfig.url).host}
            </div>
          </div>
        </div>
      </div>
    ),
    size
  )
}
