/**
 * Brand and cross-app URL configuration shared by the landing site and portal.
 *
 * In production, point each app at its own domain:
 * - Landing: NEXT_PUBLIC_SITE_URL=https://amakai.com
 * - Portal:  NEXT_PUBLIC_SITE_URL=https://portal.amakai.com
 *
 * Cross-links use NEXT_PUBLIC_LANDING_URL and NEXT_PUBLIC_PORTAL_URL so CTAs
 * on the marketing site open the portal domain, and portal pages link back.
 */

function trimTrailingSlash(url: string) {
  return url.replace(/\/$/, "")
}

export const landingUrl = trimTrailingSlash(
  process.env.NEXT_PUBLIC_LANDING_URL ??
    (process.env.NEXT_PUBLIC_APP === "portal"
      ? "http://localhost:3000"
      : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"))
)

export const portalUrl = trimTrailingSlash(
  process.env.NEXT_PUBLIC_PORTAL_URL ??
    (process.env.NEXT_PUBLIC_APP === "landing"
      ? "http://localhost:3001"
      : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"))
)

/** Absolute URLs to the portal sign-in and sign-up routes (for the landing site). */
export const portalRoutes = {
  signIn: `${portalUrl}/login`,
  signUp: `${portalUrl}/signup`,
} as const

export const siteConfig = {
  name: "AmakAI",
  tagline: "Automation and custom software for teams that outgrew their spreadsheets.",
  description:
    "AmakAI builds done-for-you automations, AI assistants and internal software for small and mid-size businesses, so your team stops copying and pasting between apps.",
  /** Each app sets this to its own public URL at deploy time. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? landingUrl,
  email: "hello@amakai.com",
  locale: "en_US",
  keywords: [
    "business process automation",
    "workflow automation agency",
    "custom internal tools",
    "AI agents for business",
    "custom SaaS development",
    "n8n consultant",
  ],
}
