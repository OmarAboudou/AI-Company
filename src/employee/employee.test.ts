import { describe, expect, test } from "bun:test"
import { EmployeeConfigSchema } from "./employee.ts"

const llm = {
    name: "Claude Senior",
    kind: "llm",
    provider: "anthropic",
    model: "claude-opus-5-5",
} as const

const human = { name: "Omar Aboudou", kind: "human" } as const

function accepts(config: unknown): boolean {
    return EmployeeConfigSchema.safeParse(config).success
}

describe("EmployeeConfigSchema", () => {
    test("accepts an LLM employee with a provider and a model", () => {
        expect(EmployeeConfigSchema.parse(llm)).toEqual(llm)
    })

    test("accepts a human employee", () => {
        expect(EmployeeConfigSchema.parse(human)).toEqual(human)
    })

    test("trims whitespace around the name", () => {
        const config = EmployeeConfigSchema.parse({ ...human, name: " Omar " })

        expect(config.name).toBe("Omar")
    })

    test("rejects an empty or whitespace-only name", () => {
        expect(accepts({ ...human, name: "" })).toBe(false)
        expect(accepts({ ...human, name: "   " })).toBe(false)
    })

    test("rejects an unknown kind", () => {
        expect(accepts({ ...human, kind: "robot" })).toBe(false)
    })

    test("requires a provider and a model for an LLM employee", () => {
        const { provider, ...withoutProvider } = llm
        const { model, ...withoutModel } = llm

        expect(accepts(withoutProvider)).toBe(false)
        expect(accepts(withoutModel)).toBe(false)
    })

    test("requires kebab-case provider and model ids", () => {
        expect(accepts({ ...llm, provider: "Anthropic" })).toBe(false)
        expect(accepts({ ...llm, model: "llama3.1:8b" })).toBe(false)
    })

    test("rejects a provider or a model on a human employee", () => {
        expect(accepts({ ...human, provider: "anthropic" })).toBe(false)
        expect(accepts({ ...human, model: "claude-opus-5-5" })).toBe(false)
    })

    test("rejects an unknown key", () => {
        expect(accepts({ ...human, id: "omar" })).toBe(false)
    })
})
