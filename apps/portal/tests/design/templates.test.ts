import { templateCatalog } from "@/lib/data/templates"
import { resolveNodeDefinition } from "@/lib/design/resolve-node-definition"
import { validateNodeConfig } from "@/lib/validation/workflow-node-config"

describe("template catalog", () => {
  it("exposes unique template ids", () => {
    const ids = templateCatalog.map((template) => template.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  for (const template of templateCatalog) {
    describe(template.name, () => {
      it("reports the real node count", () => {
        expect(template.nodeCount).toBe(template.nodes.length)
      })

      it("authors a grid position for every node", () => {
        for (const node of template.nodes) {
          expect(node.position).toBeDefined()
        }
      })

      it("spreads branches across more than one lane", () => {
        const lanes = new Set(template.nodes.map((node) => node.position?.y))
        const hasBranchingNode = template.nodes.some(
          (node) => node.kind === "conditional" || node.kind === "parallel"
        )

        if (hasBranchingNode) {
          expect(lanes.size).toBeGreaterThan(1)
        }
      })

      it("starts from exactly one trigger", () => {
        const triggers = template.nodes.filter((node) => node.kind === "trigger")
        expect(triggers).toHaveLength(1)
      })

      it("passes draft config validation on every node", () => {
        for (const node of template.nodes) {
          expect(validateNodeConfig(node)).toEqual({ ok: true })
        }
      })

      it("connects edges to declared ports on existing nodes", () => {
        const nodeById = new Map(template.nodes.map((node) => [node.id, node]))

        for (const edge of template.edges) {
          const source = nodeById.get(edge.source)
          const target = nodeById.get(edge.target)

          expect(source).toBeDefined()
          expect(target).toBeDefined()
          if (!source || !target) {
            continue
          }

          const outputs = resolveNodeDefinition(source).outputs.map(
            (port) => port.id
          )
          const inputs = resolveNodeDefinition(target).inputs.map(
            (port) => port.id
          )

          expect(outputs).toContain(edge.sourcePort ?? "main-out")
          expect(inputs).toContain(edge.targetPort ?? "main-in")
        }
      })

      it("reaches every non-trigger node from an edge", () => {
        const targets = new Set(template.edges.map((edge) => edge.target))

        for (const node of template.nodes) {
          if (node.kind === "trigger") {
            continue
          }
          expect(targets.has(node.id)).toBe(true)
        }
      })
    })
  }
})
