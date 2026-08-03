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
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
} as const

/**
 * Copy for the `/login` and `/signup` pages.
 */
export const portal = {
  badge: "Client portal",
  metaDescription: `Sign in to the ${siteConfig.name} client portal.`,
  backCta: { label: "Back to the site", href: landingUrl } satisfies CtaLink,
  signIn: {
    title: "Sign in",
    description:
      "Use Google, GitHub, or your email and password to access your workspace.",
    crossLinkPrompt: "Not working with us yet?",
    crossLink: { label: "Create an account", href: portalRoutes.signUp },
  } satisfies PortalPageCopy,
  signUp: {
    title: "Create an account",
    description:
      "Choose a username and create your portal account with Google, GitHub, or email and password.",
    crossLinkPrompt: "Already have an account?",
    crossLink: { label: "Sign in", href: portalRoutes.signIn },
  } satisfies PortalPageCopy,
  forgotPassword: {
    title: "Reset your password",
    description:
      "Enter the email address for your account and we will send you a link to choose a new password.",
    crossLinkPrompt: "Remember your password?",
    crossLink: { label: "Back to sign in", href: portalRoutes.signIn },
  } satisfies PortalPageCopy,
  resetPassword: {
    title: "Choose a new password",
    description: "Enter a new password for your account.",
    crossLinkPrompt: "Need a new reset link?",
    crossLink: { label: "Request one", href: portalRoutes.forgotPassword },
  } satisfies PortalPageCopy,
}
