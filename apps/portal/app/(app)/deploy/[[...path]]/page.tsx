import { redirect } from "next/navigation"

export default function DeployRedirectPage() {
  redirect("/operate/live-workflows")
}
