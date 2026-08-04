import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Pro plan",
}

/** Legacy path — Pro checkout is on Billing. */
export default function ProPlanPage() {
  redirect("/admin/billing")
}
