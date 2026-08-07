import {
  billableTokens,
  buildQuotaSnapshot,
  currentAiPeriodStart,
  tokensToCredits,
  OUTPUT_WEIGHT,
  AI_TOKEN_ALLOWANCE,
} from "@/lib/ai/quota"
import { hashChunkContent, chunkMarkdownDocument } from "@/lib/ai/chunking"
import { ASSISTANT_ALLOWED_SAFETY, isToolAllowed } from "@/lib/ai/tools/types"
import { ALL_TOOL_META } from "@/lib/ai/tools/meta"
import {
  normalizeAiWorkflowGraphInput,
  validateAiWorkflowGraph,
  validateAiWorkflowGraphWithRepair,
} from "@/lib/ai/graph-validation"
import type { AiWorkflowGraphInput } from "@/lib/ai/graph-validation"
import { enrichAiWorkflowGraph } from "@/lib/ai/workflow-graph-enrichment"
import { getWorkflowBuildGuide } from "@/lib/ai/workflow-build-guide"
import {
  consumeConfirmation,
  createConfirmationRequest,
  peekConfirmation,
} from "@/lib/ai/tools/confirmation"
import { selectExcessThreadIds } from "@/lib/domain/ai"

function toolsAllowedForAssistant() {
  return ALL_TOOL_META.filter((entry) =>
    ASSISTANT_ALLOWED_SAFETY.includes(entry.safety)
  ).map((entry) => entry.name)
}

function getToolSafety(name: string) {
  return ALL_TOOL_META.find((entry) => entry.name === name)?.safety ?? null
}

describe("ai thread limits", () => {
  it("selects oldest threads to prune when over the active limit", () => {
    const ids = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"]
    expect(selectExcessThreadIds(ids, 10, 1)).toEqual(["a", "b"])
    expect(selectExcessThreadIds(ids, 10, 0)).toEqual(["a"])
    expect(selectExcessThreadIds(ids.slice(0, 10), 10, 1)).toEqual(["a"])
  })
})

describe("ai quota math", () => {
  it("weights output tokens", () => {
    expect(billableTokens({ inputTokens: 1000, outputTokens: 100 })).toBe(
      1000 + OUTPUT_WEIGHT * 100
    )
  })

  it("builds a free-plan snapshot", () => {
    const snapshot = buildQuotaSnapshot({
      plan: "free",
      usedTokens: 500_000,
      periodStart: "2026-08-01",
    })
    expect(snapshot.allowanceTokens).toBe(AI_TOKEN_ALLOWANCE.free)
    expect(snapshot.remainingTokens).toBe(500_000)
    expect(snapshot.usedCredits).toBe(tokensToCredits(500_000))
    expect(snapshot.exhausted).toBe(false)
  })

  it("marks exhausted when used >= allowance", () => {
    const snapshot = buildQuotaSnapshot({
      plan: "pro",
      usedTokens: AI_TOKEN_ALLOWANCE.pro,
    })
    expect(snapshot.exhausted).toBe(true)
    expect(snapshot.remainingTokens).toBe(0)
  })

  it("uses UTC month period starts", () => {
    expect(currentAiPeriodStart(new Date("2026-08-07T12:00:00Z"))).toBe(
      "2026-08-01"
    )
    expect(currentAiPeriodStart(new Date("2026-01-01T00:00:00Z"))).toBe(
      "2026-01-01"
    )
  })
})

describe("ai tool safety", () => {
  it("exposes the full tool surface to the assistant", () => {
    expect(isToolAllowed("destructive")).toBe(true)
    expect(isToolAllowed("additive")).toBe(true)
    expect(isToolAllowed("read")).toBe(true)
    expect(ASSISTANT_ALLOWED_SAFETY).toEqual([
      "read",
      "planning",
      "additive",
      "destructive",
    ])
  })

  it("includes write and planning tools", () => {
    const allowed = toolsAllowedForAssistant()
    expect(allowed).toContain("search_product_knowledge")
    expect(allowed).toContain("ask_clarification")
    expect(allowed).toContain("create_workflow")
    expect(allowed).toContain("deploy_workflow")
    expect(allowed).toContain("get_workflow_build_guide")
  })

  it("exposes correct safety metadata", () => {
    expect(getToolSafety("deploy_workflow")).toBe("destructive")
    expect(getToolSafety("create_data_table")).toBe("additive")
    expect(getToolSafety("list_workflows")).toBe("read")
    expect(ALL_TOOL_META.length).toBeGreaterThan(0)
  })
})

describe("chunk hashing idempotency", () => {
  it("hashes identical content the same way", () => {
    const a = hashChunkContent("hello world")
    const b = hashChunkContent("hello world")
    expect(a).toBe(b)
    expect(a).toHaveLength(64)
  })

  it("chunks markdown by headings consistently", () => {
    const markdown = `# Title\n\nIntro paragraph.\n\n## Section\n\nBody text here.`
    const first = chunkMarkdownDocument("docs/test.md", markdown)
    const second = chunkMarkdownDocument("docs/test.md", markdown)
    expect(first).toEqual(second)
    expect(first.length).toBeGreaterThan(0)
    expect(first[0].source).toBe("docs/test.md")
  })
})

describe("confirmation tokens", () => {
  it("creates and verifies signed confirmation tokens", () => {
    const request = createConfirmationRequest({
      userId: "user-1",
      toolName: "deploy_workflow",
      summary: "Deploy test workflow",
      payload: { workflowId: "wf-1" },
    })

    expect(request.requiresConfirmation).toBe(true)
    expect(request.confirmationId.length).toBeGreaterThan(20)

    const peeked = peekConfirmation(request.confirmationId)
    expect(peeked?.userId).toBe("user-1")
    expect(peeked?.toolName).toBe("deploy_workflow")

    const payload = consumeConfirmation({
      userId: "user-1",
      confirmationId: request.confirmationId,
      toolName: "deploy_workflow",
    })
    expect(payload).toEqual({ workflowId: "wf-1" })
  })

  it("rejects tokens for the wrong user or tool", () => {
    const request = createConfirmationRequest({
      userId: "user-1",
      toolName: "deploy_workflow",
      summary: "Deploy test workflow",
      payload: { workflowId: "wf-1" },
    })

    expect(
      consumeConfirmation({
        userId: "user-2",
        confirmationId: request.confirmationId,
        toolName: "deploy_workflow",
      })
    ).toBeNull()

    expect(
      consumeConfirmation({
        userId: "user-1",
        confirmationId: request.confirmationId,
        toolName: "delete_workflow",
      })
    ).toBeNull()
  })
})

describe("graph validation repair loop", () => {
  it("normalizes Gmail-style trigger labels to integration mode", () => {
    const normalized = normalizeAiWorkflowGraphInput({
      nodes: [
        {
          id: "trigger-1",
          label: "Gmail trigger",
          kind: "trigger",
          config: {
            catalogItemId: "trigger.workflow",
            triggerMode: "manual",
          },
        },
      ],
      edges: [],
    }) as {
      nodes: Array<{ config: Record<string, unknown> }>
    }

    expect(normalized.nodes[0].config.triggerMode).toBe("integration")
    expect(normalized.nodes[0].config.service).toBe("email")
    expect(normalized.nodes[0].config.provider).toBe("gmail")
    expect(normalized.nodes[0].config.operation).toBe("receive")
  })

  it("requires secrets on integration email triggers", () => {
    const result = validateAiWorkflowGraph({
      nodes: [
        {
          id: "trigger-1",
          label: "Gmail trigger",
          kind: "trigger",
          config: {
            catalogItemId: "trigger.workflow",
            triggerMode: "integration",
            service: "email",
            provider: "gmail",
            operation: "receive",
            authMode: "secret",
          },
        },
      ],
      edges: [],
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => /secret|mailbox/i.test(issue))
      ).toBe(true)
    }
  })

  it("normalizes common AI graph mistakes before validation", () => {
    const result = validateAiWorkflowGraph({
      nodes: [
        {
          id: "trigger-1",
          label: "Email",
          kind: "trigger",
          catalogItemId: "trigger.workflow",
          config: { triggerMode: "email" },
        },
        {
          id: "edit-1",
          label: "Edit",
          kind: "action",
          config: { catalogItemId: "action.edit-fields", fieldCount: 1 },
        },
      ],
      edges: [{ id: "e1", source: "trigger-1", target: "edit-1" }],
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      const normalized = normalizeAiWorkflowGraphInput({
        nodes: [
          {
            id: "trigger-1",
            label: "Email",
            kind: "trigger",
            catalogItemId: "trigger.workflow",
            config: { triggerMode: "email" },
          },
          {
            id: "edit-1",
            label: "Edit",
            kind: "action",
            config: { catalogItemId: "action.edit-fields", fieldCount: 1 },
          },
        ],
        edges: [{ id: "e1", source: "trigger-1", target: "edit-1" }],
      }) as {
        nodes: Array<{ kind: string; config: Record<string, unknown> }>
      }

      expect(normalized.nodes[0].config.triggerMode).toBe("integration")
      expect(normalized.nodes[1].kind).toBe("sequential")
      expect(result.issues.some((issue) => /secret|mailbox/i.test(issue))).toBe(
        true
      )
    }
  })

  it("rejects unknown catalog ids", () => {
    const result = validateAiWorkflowGraph({
      nodes: [
        {
          id: "n1",
          label: "Broken",
          kind: "sequential",
          config: { catalogItemId: "does.not.exist" },
        },
      ],
      edges: [],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.issues.some((issue) => /Unknown catalogItemId/.test(issue))
      ).toBe(true)
    }
  })

  it("enriches graphs with layout and edge ports", () => {
    const guide = getWorkflowBuildGuide()
    expect(guide.example.nodes.length).toBeGreaterThanOrEqual(3)
    expect(guide.privileges.canCreateDataTables).toBe(true)

    const enriched = enrichAiWorkflowGraph(
      guide.example as unknown as AiWorkflowGraphInput
    )
    expect(enriched.nodes[0].position).toBeDefined()
    expect(enriched.edges[0].sourcePort).toBe("main-out")
    expect(enriched.edges[0].targetPort).toBe("input-1")
    expect(enriched.edges[1].targetPort).toBe("main-in")
  })

  it("repairs invalid graphs within the retry budget", async () => {
    let attempts = 0
    const result = await validateAiWorkflowGraphWithRepair(
      {
        nodes: [
          {
            id: "n1",
            label: "Broken",
            kind: "sequential",
            config: { catalogItemId: "does.not.exist" },
          },
        ],
        edges: [],
      },
      async () => {
        attempts += 1
        return {
          nodes: [
            {
              id: "trigger-1",
              label: "Start",
              kind: "trigger",
              config: {
                catalogItemId: "trigger.workflow",
                triggerMode: "manual",
              },
            },
          ],
          edges: [],
        }
      }
    )

    expect(attempts).toBe(1)
    expect(result.ok).toBe(true)
  })
})
