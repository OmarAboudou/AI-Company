import { describe, expect, test } from "bun:test"
import { EmployeeConfigSchema } from "./employee.ts"

const llm = {
    name: "Claude Senior",
    kind: "llm",
    provider: "anthropic",
    model: "claude-opus-5-5",
} as const

const human = { name: "Omar Aboudou", kind: "human" } as const

describe("EmployeeConfigSchema", () => {
    test("accepts an LLM employee with a provider and a model", () => {
        expect(EmployeeConfigSchema.parse(llm)).toEqual(llm)
    })

    test("accepts a human employee", () => {
        expect(EmployeeConfigSchema.parse(human)).toEqual(human)
    })

    test("trims whitespace around the name", () => {
        expect(
            EmployeeConfigSchema.parse({ ...human, name: "  Omar  " }).name,
        ).toBe("Omar")
    })

    test("rejects an empty or whitespace-only name", () => {
        expect(
            EmployeeConfigSchema.safeParse({ ...human, name: "" }).success,
        ).toBe(false)
        expect(
            EmployeeConfigSchema.safeParse({ ...human, name: "   " }).success,
        ).toBe(false)
    })

    test("rejects an unknown kind", () => {
        expect(
            EmployeeConfigSchema.safeParse({ ...human, kind: "robot" }).success,
        ).toBe(false)
    })

    test("requires a provider and a model for an LLM employee", () => {
        const { provider, ...withoutProvider } = llm
        const { model, ...withoutModel } = llm

        expect(EmployeeConfigSchema.safeParse(withoutProvider).success).toBe(
            false,
        )
        expect(EmployeeConfigSchema.safeParse(withoutModel).success).toBe(false)
    })

    test("requires kebab-case provider and model ids", () => {
        expect(
            EmployeeConfigSchema.safeParse({ ...llm, provider: "Anthropic" })
                .success,
        ).toBe(false)
        expect(
            EmployeeConfigSchema.safeParse({ ...llm, model: "llama3.1:8b" })
                .success,
        ).toBe(false)
    })

    test("rejects a provider or a model on a human employee", () => {
        expect(
            EmployeeConfigSchema.safeParse({ ...human, provider: "anthropic" })
                .success,
        ).toBe(false)
        expect(
            EmployeeConfigSchema.safeParse({
                ...human,
                model: "claude-opus-5-5",
            }).success,
        ).toBe(false)
    })

    test("rejects an unknown key", () => {
        expect(
            EmployeeConfigSchema.safeParse({ ...human, id: "omar" }).success,
        ).toBe(false)
    })
})
