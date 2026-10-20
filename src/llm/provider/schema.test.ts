import { describe, expect, test } from "bun:test"
import { LlmProviderConfigSchema } from "./schema.ts"

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

describe("LlmProviderConfigSchema apiKeySource", () => {
    const envSource = { kind: "env", variable: "ANTHROPIC_API_KEY" } as const
    const fileSource = { kind: "file", path: "~/.keys/anthropic" } as const

    test("accepts an environment variable or a file", () => {
        const envProvider = { ...anthropic, apiKeySource: envSource }
        const fileProvider = { ...anthropic, apiKeySource: fileSource }

        const parsedEnvProvider = LlmProviderConfigSchema.parse(envProvider)
        const parsedFileProvider = LlmProviderConfigSchema.parse(fileProvider)

        expect(parsedEnvProvider).toEqual(envProvider)
        expect(parsedFileProvider).toEqual(fileProvider)
    })

    test("rejects the key itself", () => {
        const providerWithKey = { ...anthropic, apiKeySource: "sk-ant-xyz" }
        const providerWithKeyObject = {
            ...anthropic,
            apiKeySource: { value: "sk-ant-xyz" },
        }

        expect(accepts(providerWithKey)).toBe(false)
        expect(accepts(providerWithKeyObject)).toBe(false)
    })

    test("rejects an unknown kind", () => {
        const apiKeySource = { kind: "vault", variable: "ANTHROPIC_API_KEY" }

        expect(accepts({ ...anthropic, apiKeySource })).toBe(false)
    })

    test("rejects the other kind's field", () => {
        const apiKeySource = { ...envSource, path: "~/.keys/anthropic" }

        expect(accepts({ ...anthropic, apiKeySource })).toBe(false)
    })

    test("rejects an invalid environment variable name", () => {
        const sourceStartingWithDigit = { ...envSource, variable: "1KEY" }
        const hyphenatedSource = { ...envSource, variable: "MY-KEY" }

        const digitFirstProvider = {
            ...anthropic,
            apiKeySource: sourceStartingWithDigit,
        }
        const hyphenatedProvider = {
            ...anthropic,
            apiKeySource: hyphenatedSource,
        }

        expect(accepts(digitFirstProvider)).toBe(false)
        expect(accepts(hyphenatedProvider)).toBe(false)
    })

    test("rejects a variable written with $, as a shell reads it", () => {
        const apiKeySource = { ...envSource, variable: "$ANTHROPIC_API_KEY" }

        expect(accepts({ ...anthropic, apiKeySource })).toBe(false)
    })

    test("rejects an empty file path", () => {
        const apiKeySource = { ...fileSource, path: " " }

        expect(accepts({ ...anthropic, apiKeySource })).toBe(false)
    })
})
