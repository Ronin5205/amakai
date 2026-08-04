import {
  formatSubscriptionLabel,
  planFromVerifiedSubscription,
} from "@/lib/domain/billing"

describe("planFromVerifiedSubscription", () => {
  const proPrice = "price_pro_test"

  it("stays free when Pro price is not configured", () => {
    expect(
      planFromVerifiedSubscription({
        status: "active",
        priceIds: [proPrice],
        expectedProPriceId: null,
      })
    ).toBe("free")
  })

  it("stays free when subscription uses a different price", () => {
    expect(
      planFromVerifiedSubscription({
        status: "active",
        priceIds: ["price_other"],
        expectedProPriceId: proPrice,
      })
    ).toBe("free")
  })

  it("stays free when status is incomplete or unpaid", () => {
    expect(
      planFromVerifiedSubscription({
        status: "incomplete",
        priceIds: [proPrice],
        expectedProPriceId: proPrice,
      })
    ).toBe("free")

    expect(
      planFromVerifiedSubscription({
        status: "unpaid",
        priceIds: [proPrice],
        expectedProPriceId: proPrice,
      })
    ).toBe("free")
  })

  it("grants pro only for active/trialing with the configured price", () => {
    expect(
      planFromVerifiedSubscription({
        status: "active",
        priceIds: [proPrice],
        expectedProPriceId: proPrice,
      })
    ).toBe("pro")

    expect(
      planFromVerifiedSubscription({
        status: "trialing",
        priceIds: [proPrice],
        expectedProPriceId: proPrice,
      })
    ).toBe("pro")
  })

  it("keeps pro while status is still active even if cancel is scheduled", () => {
    expect(
      planFromVerifiedSubscription({
        status: "active",
        priceIds: [proPrice],
        expectedProPriceId: proPrice,
      })
    ).toBe("pro")
  })
})

describe("formatSubscriptionLabel", () => {
  it("shows active until period end when cancel_at_period_end is set", () => {
    expect(
      formatSubscriptionLabel({
        plan: "pro",
        subscriptionStatus: "active",
        cancelAtPeriodEnd: true,
        currentPeriodEnd: "2026-09-04T00:00:00.000Z",
      })
    ).toMatch(/^Active until /)
  })

  it("shows renews when not canceling", () => {
    expect(
      formatSubscriptionLabel({
        plan: "pro",
        subscriptionStatus: "active",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: "2026-09-04T00:00:00.000Z",
      })
    ).toMatch(/^Active — renews /)
  })
})
