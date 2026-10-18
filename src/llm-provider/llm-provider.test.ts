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
    const env = { kind: "env", variable: "ANTHROPIC_API_KEY" } as const
    const file = { kind: "file", path: "~/.keys/anthropic" } as const

    test("accepts an environment variable or a file", () => {
        const fromEnv = { ...anthropic, apiKey: env }
        const fromFile = { ...anthropic, apiKey: file }

        expect(LlmProviderConfigSchema.parse(fromEnv)).toEqual(fromEnv)
        expect(LlmProviderConfigSchema.parse(fromFile)).toEqual(fromFile)
    })

    test("rejects the key itself", () => {
        const key = { ...anthropic, apiKey: "sk-ant-xyz" }
        const keyObject = { ...anthropic, apiKey: { value: "sk-ant-xyz" } }

        expect(accepts(key)).toBe(false)
        expect(accepts(keyObject)).toBe(false)
    })

    test("rejects an unknown kind", () => {
        const apiKey = { kind: "vault", variable: "ANTHROPIC_API_KEY" }

        expect(accepts({ ...anthropic, apiKey })).toBe(false)
    })

    test("rejects the other kind's field", () => {
        const apiKey = { ...env, path: "~/.keys/anthropic" }

        expect(accepts({ ...anthropic, apiKey })).toBe(false)
    })

    test("rejects an invalid environment variable name", () => {
        const startsWithDigit = { ...env, variable: "1KEY" }
        const hyphenated = { ...env, variable: "MY-KEY" }

        expect(accepts({ ...anthropic, apiKey: startsWithDigit })).toBe(false)
        expect(accepts({ ...anthropic, apiKey: hyphenated })).toBe(false)
    })

    test("rejects a variable written with $, as a shell reads it", () => {
        const apiKey = { ...env, variable: "$ANTHROPIC_API_KEY" }

        expect(accepts({ ...anthropic, apiKey })).toBe(false)
    })

    test("rejects an empty file path", () => {
        const apiKey = { ...file, path: " " }

        expect(accepts({ ...anthropic, apiKey })).toBe(false)
    })
})
