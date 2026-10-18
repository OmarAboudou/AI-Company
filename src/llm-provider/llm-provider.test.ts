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

describe("LlmProviderConfigSchema apiKey", () => {
    test("accepts an environment variable or a file", () => {
        const env = { ...anthropic, apiKey: { env: "ANTHROPIC_API_KEY" } }
        const file = { ...anthropic, apiKey: { file: "~/.keys/anthropic" } }

        expect(LlmProviderConfigSchema.parse(env)).toEqual(env)
        expect(LlmProviderConfigSchema.parse(file)).toEqual(file)
    })

    test("rejects the key itself", () => {
        const key = { ...anthropic, apiKey: "sk-ant-xyz" }
        const keyObject = { ...anthropic, apiKey: { value: "sk-ant-xyz" } }

        expect(accepts(key)).toBe(false)
        expect(accepts(keyObject)).toBe(false)
    })

    test("rejects both sources at once", () => {
        const apiKey = { env: "ANTHROPIC_API_KEY", file: "~/.keys/anthropic" }

        expect(accepts({ ...anthropic, apiKey })).toBe(false)
    })

    test("rejects an invalid environment variable name", () => {
        expect(accepts({ ...anthropic, apiKey: { env: "1KEY" } })).toBe(false)
        expect(accepts({ ...anthropic, apiKey: { env: "MY-KEY" } })).toBe(false)
    })

    test("rejects a variable written with $, as a shell reads it", () => {
        const apiKey = { env: "$ANTHROPIC_API_KEY" }

        expect(accepts({ ...anthropic, apiKey })).toBe(false)
    })

    test("rejects an empty file path", () => {
        expect(accepts({ ...anthropic, apiKey: { file: " " } })).toBe(false)
    })
})
