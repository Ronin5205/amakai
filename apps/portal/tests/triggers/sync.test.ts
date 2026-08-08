import {
  resolveTriggerForSync,
  withCanonicalTriggerConfig,
} from "@/lib/triggers/resolve"
import {
  buildEmailPayload,
  buildWebhookPayload,
  buildSchedulePayload,
} from "@/lib/triggers/payloads"
import { TRIGGER_HANDLERS } from "@/lib/triggers/registry"
import { workflowNode } from "../fixtures/workflow-fixtures"

describe("resolveTriggerForSync", () => {
  it("fills gmail provider/operation when triggerMode is email alias", () => {
    const node = workflowNode({
      id: "trigger-1",
      kind: "trigger",
      label: "Inbox",
      config: {
        catalogItemId: "trigger.workflow",
        triggerMode: "email",
        secretName: "my_gmail",
      },
    })

    const resolved = resolveTriggerForSync(node)
    expect(resolved.mode).toBe("integration")
    expect(resolved.config.provider).toBe("gmail")
    expect(resolved.config.operation).toBe("receive")
    expect(resolved.config.service).toBe("email")
    expect(resolved.recipe.id).toBe("gmail.receive")
  })

  it("infers gmail receive from inbox-style labels when mode is manual", () => {
    const node = workflowNode({
      id: "trigger-1",
      kind: "trigger",
      label: "Gmail trigger",
      config: {
        catalogItemId: "trigger.workflow",
        triggerMode: "manual",
      },
    })

    const resolved = resolveTriggerForSync(node)
    expect(resolved.mode).toBe("integration")
    expect(resolved.config.provider).toBe("gmail")
    expect(resolved.config.operation).toBe("receive")
  })

  it("canonicalizes node config for deploy persistence", () => {
    const node = workflowNode({
      id: "trigger-1",
      kind: "trigger",
      label: "Start",
      config: {
        catalogItemId: "trigger.workflow",
        triggerMode: "email",
      },
    })

    const next = withCanonicalTriggerConfig(node)
    expect(next.config.triggerMode).toBe("integration")
    expect(next.config.provider).toBe("gmail")
    expect(Array.isArray(next.config.outputFields)).toBe(true)
    expect(next.config.outputFields).toEqual(
      expect.arrayContaining(["from", "subject", "body"])
    )
  })
})

describe("trigger payloads", () => {
  it("builds email payload with provider metadata", () => {
    const payload = buildEmailPayload(
      {
        from: "a@example.com",
        to: "b@example.com",
        subject: "Hi",
        body: "Body",
        bodyHtml: "<p>Body</p>",
        messageId: "m1",
        threadId: "t1",
        receivedAt: "2026-08-08T12:00:00.000Z",
        attachments: [],
      },
      "gmail"
    )

    expect(payload.triggerType).toBe("email")
    expect(payload.provider).toBe("gmail")
    expect(payload.subject).toBe("Hi")
    expect(typeof payload.triggeredAt).toBe("string")
  })

  it("maps webhook body keys onto the payload", () => {
    const payload = buildWebhookPayload(
      { eventId: "evt-1", email: "jane@example.com" },
      "webhook"
    )
    expect(payload.eventId).toBe("evt-1")
    expect(payload.email).toBe("jane@example.com")
    expect(payload.triggerType).toBe("webhook")
  })

  it("builds schedule payload", () => {
    const payload = buildSchedulePayload({
      scheduledFor: "2026-08-08T12:00:00.000Z",
      triggeredAt: "2026-08-08T12:00:00.000Z",
      scheduleSummary: "Daily at 12:00",
    })
    expect(payload.triggerType).toBe("schedule")
    expect(payload.scheduleSummary).toBe("Daily at 12:00")
  })
})

describe("TRIGGER_HANDLERS registry", () => {
  it("documents renewable email recipes", () => {
    expect(TRIGGER_HANDLERS["gmail.receive"].renewable).toBe(true)
    expect(TRIGGER_HANDLERS["outlook.receive"].renewable).toBe(true)
    expect(TRIGGER_HANDLERS.webhook.inbound).toBe("webhook")
    expect(TRIGGER_HANDLERS.manual.inbound).toBe("none")
  })
})
