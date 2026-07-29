import { landingUrl, siteConfig } from "@amakai/shared/lib/site-config"

export interface CtaLink {
  label: string
  href: string
}

export interface PortalPageCopy {
  title: string
  description: string
  crossLinkPrompt: string
  crossLink: CtaLink
}

/** In-app routes — the portal app owns these paths on its own domain. */
export const portalRoutes = {
  signIn: "/login",
  signUp: "/signup",
} as const

/**
 * Copy for the `/login` and `/signup` stubs. Both pages share the badge and the
 * two buttons, so those live once at the top level.
 */
export const portal = {
  badge: "Portal opening soon",
  metaDescription: `The ${siteConfig.name} client portal is opening soon.`,
  emailCta: {
    label: `Email ${siteConfig.email}`,
    href: `mailto:${siteConfig.email}`,
  } satisfies CtaLink,
  backCta: { label: "Back to the site", href: landingUrl } satisfies CtaLink,
  signIn: {
    title: "Sign in",
    description:
      "Accounts are not live yet — we are still wiring up the client portal. Until it opens, email us and a person picks it up directly.",
    crossLinkPrompt: "Not working with us yet?",
    crossLink: { label: "Start an account", href: portalRoutes.signUp },
  } satisfies PortalPageCopy,
  signUp: {
    title: "Create an account",
    description:
      "Sign-up is not open yet. Email us the process that wastes the most time and we will map it for you before the portal launches — no sales call, no charge.",
    crossLinkPrompt: "Already working with us?",
    crossLink: { label: "Sign in", href: portalRoutes.signIn },
  } satisfies PortalPageCopy,
}
