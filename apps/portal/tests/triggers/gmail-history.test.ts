/**
 * @jest-environment node
 */

const updateEq = jest.fn().mockResolvedValue({ error: null })
const update = jest.fn(() => ({ eq: updateEq }))
const from = jest.fn(() => ({ update }))

jest.mock("@/utils/supabase/admin", () => ({
  createAdminClient: () => ({ from }),
}))

import { listNewGmailMessages } from "@/lib/triggers/subscriptions/gmail"

describe("listNewGmailMessages", () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    from.mockClear()
    update.mockClear()
    updateEq.mockClear()
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it("falls back to latest inbox message when historyId is missing", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [{ id: "msg-1" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "msg-1", snippet: "hello" }),
      }) as unknown as typeof fetch

    const messages = await listNewGmailMessages("token", null)
    expect(messages).toHaveLength(1)
    expect((messages[0] as { id: string }).id).toBe("msg-1")
  })

  it("resets history and falls back when History API returns 404", async () => {
    const reRegisterWatch = jest.fn().mockResolvedValue({
      historyId: "999",
      expiration: String(Date.now() + 86_400_000),
    })

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => "history not found",
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [{ id: "fallback-1" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "fallback-1", snippet: "recovered" }),
      }) as unknown as typeof fetch

    const messages = await listNewGmailMessages("token", "stale-history", {
      subscriptionId: "sub-1",
      reRegisterWatch,
    })

    expect(messages).toHaveLength(1)
    expect((messages[0] as { id: string }).id).toBe("fallback-1")
    expect(reRegisterWatch).toHaveBeenCalled()
    expect(from).toHaveBeenCalledWith("workflow_trigger_subscriptions")
    expect(update).toHaveBeenCalled()
  })

  it("returns [] and logs on non-404 history failure", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "server error",
    }) as unknown as typeof fetch

    const messages = await listNewGmailMessages("token", "hist-1")
    expect(messages).toEqual([])
    expect(errorSpy).toHaveBeenCalled()
  })

  it("fetches message details for history messageAdded ids", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          history: [
            {
              messagesAdded: [{ message: { id: "a" } }, { message: { id: "b" } }],
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "a" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "b" }),
      }) as unknown as typeof fetch

    const messages = await listNewGmailMessages("token", "hist-ok")
    expect(messages.map((message) => (message as { id: string }).id)).toEqual([
      "a",
      "b",
    ])
  })
})
