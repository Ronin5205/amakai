import { redirect } from "next/navigation"

export default async function AlertsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const query = new URLSearchParams()

  query.set("filter", "alerts")

  for (const [key, value] of Object.entries(params)) {
    if (key === "filter" || value === undefined) {
      continue
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => query.append(key, entry))
    } else {
      query.set(key, value)
    }
  }

  redirect(`/operate/logs?${query.toString()}`)
}
