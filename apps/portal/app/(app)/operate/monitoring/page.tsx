import { redirect } from "next/navigation"

export default function MonitoringRedirectPage() {
  redirect("/operate/live-workflows")
}
