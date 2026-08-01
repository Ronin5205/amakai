import {
  ensureJsonObject,
  formatJsonForDisplay,
  parseJsonFieldValue,
  readJsonPath,
  resolvePayloadField,
} from "@/lib/design/json-value"

describe("json-value", () => {
  describe("ensureJsonObject", () => {
    it("wraps scalar payloads", () => {
      expect(ensureJsonObject("hello")).toEqual({ value: "hello" })
    })

    it("returns objects unchanged", () => {
      expect(ensureJsonObject({ a: 1 })).toEqual({ a: 1 })
    })
  })

  describe("readJsonPath", () => {
    it("reads nested object paths", () => {
      const payload = {
        orders: [{ orderId: "1" }, { orderId: "2" }],
      }

      expect(readJsonPath(payload, "orders.0.orderId")).toBe("1")
      expect(readJsonPath(payload, "orders.1.orderId")).toBe("2")
    })
  })

  describe("resolvePayloadField", () => {
    it("resolves upstream refs with nested paths", () => {
      const payload = {
        orders: [{ total: 42 }],
      }

      expect(resolvePayloadField(payload, "trigger-1.orders.0.total")).toBe(42)
    })
  })

  describe("formatJsonForDisplay", () => {
    it("pretty-prints with sorted keys", () => {
      expect(formatJsonForDisplay({ b: 2, a: 1 })).toBe(
        `{
  "a": 1,
  "b": 2
}`
      )
    })
  })

  describe("parseJsonFieldValue", () => {
    it("parses array fields from comma-separated values", () => {
      expect(parseJsonFieldValue("ord-1, ord-2, ord-3", "array")).toEqual([
        "ord-1",
        "ord-2",
        "ord-3",
      ])
      expect(parseJsonFieldValue("single", "array")).toEqual(["single"])
    })

    it("still accepts JSON arrays when input starts with [", () => {
      expect(parseJsonFieldValue('[{"id":"1"}]', "array")).toEqual([{ id: "1" }])
    })

    it("parses object field types strictly", () => {
      expect(parseJsonFieldValue('{"id":"1"}', "object")).toEqual({ id: "1" })
    })

    it("accepts JSON literals for string fields", () => {
      expect(parseJsonFieldValue("42", "string")).toBe(42)
      expect(parseJsonFieldValue("hello", "string")).toBe("hello")
    })
  })
})
