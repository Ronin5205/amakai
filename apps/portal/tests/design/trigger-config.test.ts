import {
  canonicalizeTriggerConfig,
  getTriggerRecipe,
  normalizeTriggerMode,
  resolveTriggerOutputFields,
  resolveTriggerRecipe,
} from "@/lib/design/trigger-config"
import { workflowNode } from "../fixtures/workflow-fixtures"

describe("trigger-config", () => {
  it("resolves Gmail recipe from integration config", () => {
    const recipe = resolveTriggerRecipe({
      triggerMode: "integration",
      provider: "gmail",
      operation: "receive",
    })
    expect(recipe.id).toBe("gmail.receive")
  })

  it("maps AI aliases like triggerMode=email onto integration", () => {
    const config = canonicalizeTriggerConfig({
      catalogItemId: "trigger.workflow",
      triggerMode: "email",
    })
    expect(config.triggerMode).toBe("integration")
    expect(config.provider).toBe("gmail")
    expect(config.operation).toBe("receive")
    expect(config.outputFields).toEqual(
      expect.arrayContaining(["from", "subject", "body"])
    )
  })

  it("infers Gmail receive from inbox-style labels when mode is manual", () => {
    const config = canonicalizeTriggerConfig(
      {
        catalogItemId: "trigger.workflow",
        triggerMode: "manual",
      },
      { label: "Gmail trigger" }
    )
    expect(config.triggerMode).toBe("integration")
    expect(config.provider).toBe("gmail")
  })

  it("keeps manual mode when the label is not an inbox trigger", () => {
    const config = canonicalizeTriggerConfig(
      {
        catalogItemId: "trigger.workflow",
        triggerMode: "manual",
      },
      { label: "Start" }
    )
    expect(config.triggerMode).toBe("manual")
    expect(config.outputFields).toEqual(["payload"])
  })

  it("exposes email output fields even when defs are missing on the node", () => {
    const node = workflowNode({
      id: "trigger-1",
      kind: "trigger",
      label: "Gmail inbox",
      config: {
        catalogItemId: "trigger.workflow",
        triggerMode: "integration",
        service: "email",
        provider: "gmail",
        operation: "receive",
      },
    })

    expect(normalizeTriggerMode(node)).toBe("integration")
    expect(resolveTriggerOutputFields(node).map((field) => field.name)).toEqual(
      getTriggerRecipe("gmail.receive").outputFields.map((field) => field.name)
    )
  })
})
