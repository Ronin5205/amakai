/**
 * Server-only integration execution. Import from Server Actions / API routes /
 * production runners — never from Client Components or the shared registry.
 */
import type { WorkflowNode } from "@/lib/domain/workflow"
import type { IntegrationExecuteResult } from "@/lib/integrations/registry/types"
import {
  getIntegrationOperation,
  resolveIntegrationOperationFromNode,
} from "@/lib/integrations/registry"
import {
  executeGmailSend,
  executeOutlookSend,
} from "@/lib/integrations/email/adapters"
import { executeHttpRequestProduction } from "@/lib/integrations/http/request"
import { getCatalogItemId } from "@/lib/design/component-variant-definitions"

export async function executeIntegrationNodeProduction(
  node: WorkflowNode,
  payload: Record<string, unknown>
): Promise<IntegrationExecuteResult> {
  const catalogItemId = getCatalogItemId(node)

  if (catalogItemId === "integrations.http-request") {
    return executeHttpRequestProduction({
      node,
      payload,
      mode: "production",
    })
  }

  const operation =
    catalogItemId === "integrations.external-tool"
      ? resolveIntegrationOperationFromNode(node)
      : null

  if (!operation) {
    return {
      ok: false,
      message: "Configure service, provider, and operation on this node.",
    }
  }

  const service = String(node.config.service ?? "")
  const provider = String(node.config.provider ?? "")
  const operationId = String(node.config.operation ?? "")

  if (service === "email" && operationId === "send") {
    if (provider === "gmail") {
      return executeGmailSend({ node, payload, mode: "production" })
    }
    if (provider === "outlook") {
      return executeOutlookSend({ node, payload, mode: "production" })
    }
  }

  if (service === "api" && provider === "rest" && operationId === "request") {
    return executeHttpRequestProduction({
      node,
      payload,
      mode: "production",
    })
  }

  if (service === "webhook" && operationId === "emit") {
    return executeHttpRequestProduction({
      node: {
        ...node,
        config: {
          ...node.config,
          method: "POST",
          bodyText:
            typeof node.config.bodyText === "string"
              ? node.config.bodyText
              : JSON.stringify(payload),
        },
      },
      payload,
      mode: "production",
    })
  }

  // Receive and unknown ops: use registry production path (passthrough / stub)
  const registered =
    getIntegrationOperation(service, provider, operationId) ?? operation
  return registered.executeProduction({
    node,
    payload,
    mode: "production",
  })
}
