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
  tagline:
    "Describe workflows in plain language. Deploy production-ready automations in minutes.",
  description:
    "AmakAI is an intelligent automation operating system that assembles workflows from predefined, reusable components — not generated code. Describe your requirements in natural language, and the platform configures, validates, deploys, and monitors production-ready automation pipelines.",
  /** Each app sets this to its own public URL at deploy time. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? landingUrl,
  email: "hello@amakai.com",
  locale: "en_US",
  keywords: [
    "AI workflow automation",
    "natural language workflow builder",
    "workflow assembly platform",
    "business process automation software",
    "workflow monitoring",
    "automation component library",
  ],
}
