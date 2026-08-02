import { redirect } from "next/navigation"

export default async function LiveWorkflowIndexPage({
  params,
}: {
  params: Promise<{ workflowId: string }>
}) {
  const { workflowId } = await params
  redirect(`/operate/live-workflows/${workflowId}/monitoring`)
}
