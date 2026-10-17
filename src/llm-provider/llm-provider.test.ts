import { describe, expect, test } from "bun:test"
import { LlmProviderConfigSchema } from "./llm-provider.ts"

const anthropic = { name: "Anthropic" }

function accepts(config: unknown): boolean {
    return LlmProviderConfigSchema.safeParse(config).success
}

describe("LlmProviderConfigSchema", () => {
    test("accepts a config with a name", () => {
        expect(LlmProviderConfigSchema.parse(anthropic)).toEqual(anthropic)
    })

    test("trims whitespace around the name", () => {
        const config = LlmProviderConfigSchema.parse({ name: " Anthropic " })

        expect(config.name).toBe("Anthropic")
    })

    test("rejects an empty or whitespace-only name", () => {
        expect(accepts({ name: "" })).toBe(false)
        expect(accepts({ name: "   " })).toBe(false)
    })

    test("rejects an unknown key", () => {
        expect(accepts({ ...anthropic, id: "anthropic" })).toBe(false)
    })
})
