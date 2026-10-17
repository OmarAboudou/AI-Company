import { describe, expect, test } from "bun:test"
import { LlmModelConfigSchema } from "./llm-model.ts"

const llama = { name: "Llama 3.1 8B", apiId: "llama3.1:8b" }

function accepts(config: unknown): boolean {
    return LlmModelConfigSchema.safeParse(config).success
}

describe("LlmModelConfigSchema", () => {
    test("accepts an api id in the provider's own format", () => {
        expect(LlmModelConfigSchema.parse(llama)).toEqual(llama)
    })

    test("trims whitespace around the name and the api id", () => {
        const config = LlmModelConfigSchema.parse({
            name: " Llama 3.1 8B ",
            apiId: " llama3.1:8b ",
        })

        expect(config).toEqual(llama)
    })

    test("rejects an empty or whitespace-only name", () => {
        expect(accepts({ ...llama, name: "" })).toBe(false)
        expect(accepts({ ...llama, name: "   " })).toBe(false)
    })

    test("requires an api id", () => {
        const { apiId, ...withoutApiId } = llama

        expect(accepts(withoutApiId)).toBe(false)
        expect(accepts({ ...llama, apiId: " " })).toBe(false)
    })

    test("rejects an unknown key", () => {
        expect(accepts({ ...llama, providerId: "ollama" })).toBe(false)
    })
})
