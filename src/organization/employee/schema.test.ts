import { describe, expect, test } from "bun:test"
import { EmployeeConfigSchema } from "./schema.ts"

const llmEmployee = {
    name: "Claude Senior",
    kind: "llm",
    providerId: "anthropic",
    modelId: "claude-opus-5-5",
} as const

function accepts(config: unknown): boolean {
    return EmployeeConfigSchema.safeParse(config).success
}

describe("EmployeeConfigSchema", () => {
    test("accepts an LLM employee with a provider and a model", () => {
        expect(EmployeeConfigSchema.parse(llmEmployee)).toEqual(llmEmployee)
    })

    test("rejects the id history, kept in history.json", () => {
        const createdAt = "2026-10-18T14:00:00.000Z"

        expect(accepts({ ...llmEmployee, createdAt })).toBe(false)
    })

    test("trims whitespace around the name", () => {
        const config = EmployeeConfigSchema.parse({
            ...llmEmployee,
            name: " Claude Senior ",
        })

        expect(config.name).toBe("Claude Senior")
    })

    test("rejects an empty or whitespace-only name", () => {
        expect(accepts({ ...llmEmployee, name: "" })).toBe(false)
        expect(accepts({ ...llmEmployee, name: "   " })).toBe(false)
    })

    test("rejects an unknown kind", () => {
        expect(accepts({ ...llmEmployee, kind: "human" })).toBe(false)
    })

    test("requires a provider and a model for an LLM employee", () => {
        const { providerId, ...withoutProvider } = llmEmployee
        const { modelId, ...withoutModel } = llmEmployee

        expect(accepts(withoutProvider)).toBe(false)
        expect(accepts(withoutModel)).toBe(false)
    })

    test("requires kebab-case provider and model ids", () => {
        expect(accepts({ ...llmEmployee, providerId: "Anthropic" })).toBe(false)
        expect(accepts({ ...llmEmployee, modelId: "llama3.1:8b" })).toBe(false)
    })

    test("rejects an unknown key", () => {
        expect(accepts({ ...llmEmployee, id: "omar" })).toBe(false)
    })
})
