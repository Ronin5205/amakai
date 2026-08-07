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
  validateAiWorkflowGraph,
  validateAiWorkflowGraphWithRepair,
} from "@/lib/ai/graph-validation"

function toolsAllowedForAssistant() {
  return ALL_TOOL_META.filter((entry) =>
    ASSISTANT_ALLOWED_SAFETY.includes(entry.safety)
  ).map((entry) => entry.name)
}

function getToolSafety(name: string) {
  return ALL_TOOL_META.find((entry) => entry.name === name)?.safety ?? null
}

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
    expect(snapshot.remainingTokens).toBe(1_500_000)
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

describe("graph validation repair loop", () => {
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
