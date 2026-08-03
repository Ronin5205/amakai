import { getDefaultVariantConfig } from "@/lib/design/component-variant-definitions"
import { getDefaultNodeConfig } from "@/lib/design/node-definitions"
import {
  defaultOAuthSecretName,
  parseOptionalDescription,
  parseResourceName,
} from "@/lib/validation/resource-names"
import { validateSaveDataTableInput } from "@/lib/validation/data-table-schema"
import {
  validateNodeConfig,
  validateNodeConfigForRun,
  validateWorkflowDraft,
} from "@/lib/validation/workflow-node-config"
import type { Workflow, WorkflowNode } from "@/lib/domain/workflow"

describe("resource name validation", () => {
  it("accepts readable names within the length limit", () => {
    expect(parseResourceName("Customer Orders", "Fallback")).toEqual({
      ok: true,
      name: "Customer Orders",
    })
  })

  it("rejects names that are too long", () => {
    const result = parseResourceName("a".repeat(31), "Fallback")
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("30")
    }
  })

  it("rejects names with unsupported characters", () => {
    const result = parseResourceName("Bad/Name", "Fallback")
    expect(result.ok).toBe(false)
  })

  it("validates optional descriptions", () => {
    expect(parseOptionalDescription("  Notes  ")).toEqual({
      ok: true,
      description: "Notes",
    })
    expect(parseOptionalDescription("")).toEqual({
      ok: true,
      description: null,
    })
  })

  it("builds valid OAuth secret names from email addresses", () => {
    expect(defaultOAuthSecretName("Gmail", "abdullahrazi60@gmail.com")).toBe(
      "Gmail abdullahrazi60"
    )
    expect(defaultOAuthSecretName("Outlook", "user+tag@company.com")).toBe(
      "Outlook user_tag"
    )
  })
})

describe("data table validation", () => {
  it("requires unique column keys", () => {
    const result = validateSaveDataTableInput({
      id: "table-1",
      name: "Contacts",
      columns: [
        { key: "email", label: "Email", type: "string" },
        { key: "email", label: "Email duplicate", type: "string" },
      ],
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("Duplicate column key")
    }
  })

  it("accepts a valid table schema", () => {
    const result = validateSaveDataTableInput({
      id: "table-1",
      name: "Contacts",
      description: "Demo table",
      columns: [{ key: "email", label: "Email", type: "string" }],
    })

    expect(result.ok).toBe(true)
  })
})

describe("workflow node config validation", () => {
  const triggerNode: WorkflowNode = {
    id: "trigger-1",
    label: "Trigger",
    kind: "trigger",
    config: {
      catalogItemId: "trigger.workflow",
      triggerType: "manual",
      outputFieldDefs: [{ name: "payload", type: "object" }],
    },
  }

  it("rejects duplicate trigger output field names", () => {
    const node: WorkflowNode = {
      ...triggerNode,
      config: {
        ...triggerNode.config,
        outputFieldDefs: [
          { name: "amount", type: "string" },
          { name: "Amount", type: "number" },
        ],
      },
    }

    const result = validateNodeConfig(node)
    expect(result.ok).toBe(false)
  })

  it("rejects invalid approver emails", () => {
    const node: WorkflowNode = {
      id: "approval-1",
      label: "Approval",
      kind: "approval",
      config: {
        catalogItemId: "approval.base",
        approverType: "email",
        approverEmail: "not-an-email",
      },
    }

    const result = validateNodeConfig(node)
    expect(result.ok).toBe(false)
  })

  it("validates workflow names and node configs on save", () => {
    const workflow: Workflow = {
      id: "wf-1",
      name: "Expense flow",
      nodes: [triggerNode],
      edges: [],
      updatedAt: new Date().toISOString(),
    }

    expect(validateWorkflowDraft(workflow)).toEqual({
      ok: true,
      name: "Expense flow",
    })
  })

  it("allows an unconfigured external tool trigger draft", () => {
    const variant = getDefaultVariantConfig("trigger.external-tool")
    const config: Record<string, unknown> = {
      ...getDefaultNodeConfig("trigger"),
      ...variant,
      catalogItemId: "trigger.external-tool",
    }

    expect(validateNodeConfig({
      id: "external-1",
      label: "External Tool Trigger",
      kind: "trigger",
      config,
    })).toEqual({ ok: true })

    expect(validateNodeConfigForRun({
      id: "external-1",
      label: "External Tool Trigger",
      kind: "trigger",
      config,
    })).toEqual({
      ok: false,
      error:
        "External Tool Trigger: Select a service, provider, and operation.",
    })
  })
})
