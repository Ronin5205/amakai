/**
 * Public Stripe surface for the portal.
 * Import from here — never import the `stripe` package directly.
 */
export {
  isProCheckoutEnabled,
  isStripeConfigured,
  openBillingPortalSession,
  processStripeWebhook,
  reconcileCheckoutSession,
  refreshCurrentUserSubscriptionFromStripe,
  startProCheckoutSession,
} from "@/lib/stripe/gateway"
