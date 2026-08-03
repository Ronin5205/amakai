import type { WorkflowNode } from "@/lib/domain/workflow"

export type ApprovalApproverType = "manual" | "email" | "role"

export function getApprovalApproverType(
  config: Record<string, unknown>
): ApprovalApproverType {
  const type = config.approverType
  if (type === "manual" || type === "email" || type === "role") {
    return type
  }

  if (isNonEmptyString(config.approverEmail)) {
    return "email"
  }

  return "manual"
}

function isNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
}

export function validateApprovalConfig(node: WorkflowNode) {
  const config = node.config
  const approverType = getApprovalApproverType(config)

  if (approverType === "email" && !isNonEmptyString(config.approverEmail)) {
    return {
      ok: false as const,
      message: "Approval node is missing an approver email",
    }
  }

  if (approverType === "role" && !isNonEmptyString(config.approverRole)) {
    return {
      ok: false as const,
      message: "Approval node is missing an approver role",
    }
  }

  return { ok: true as const, approverType }
}

export function describeApprovalTarget(node: WorkflowNode) {
  const config = node.config
  const approverType = getApprovalApproverType(config)

  switch (approverType) {
    case "email":
      return String(config.approverEmail ?? "").trim() || "Email not configured"
    case "role":
      return String(config.approverRole ?? "").trim() || "Role not configured"
    default:
      return "Manual approval in portal"
  }
}

export function buildApprovalActorLabel(
  node: WorkflowNode,
  decision: "approved" | "rejected"
) {
  const config = node.config
  const approverType = getApprovalApproverType(config)

  if (approverType === "email") {
    return String(config.approverEmail ?? "approver")
  }

  if (approverType === "role") {
    return `role:${String(config.approverRole ?? "unknown")}`
  }

  return decision === "approved" ? "manual-approver" : "manual-reviewer"
}

export function appendApprovalMetadata(
  payload: unknown,
  node: WorkflowNode,
  decision: "approved" | "rejected"
) {
  const basePayload =
    typeof payload === "object" && payload !== null ? payload : {}
  const actor = buildApprovalActorLabel(node, decision)
  const approverType = getApprovalApproverType(node.config)
  const timestamp = new Date().toISOString()

  if (decision === "rejected") {
    return {
      ...basePayload,
      rejectedBy: actor,
      rejectedAt: timestamp,
      approvalType: approverType,
      approverRole:
        approverType === "role" ? String(node.config.approverRole ?? "") : undefined,
    }
  }

  return {
    ...basePayload,
    approvedBy: actor,
    approvedAt: timestamp,
    approvalType: approverType,
    approverRole:
      approverType === "role" ? String(node.config.approverRole ?? "") : undefined,
  }
}
