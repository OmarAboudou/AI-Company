import { describe, expect, test } from "bun:test"
import { EmployeeConfigSchema } from "./employee.ts"

const llm = {
    name: "Claude Senior",
    kind: "llm",
    providerId: "anthropic",
    modelId: "claude-opus-5-5",
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

    test.each([llm, human])(
        "accepts the id history of a $kind employee",
        (employee) => {
            const history = {
                createdAt: "2026-10-18T14:00:00.000Z",
                formerIds: [
                    { id: "claude", until: "2026-10-19T09:00:00.000Z" },
                ],
            }

            expect(accepts({ ...employee, ...history })).toBe(true)
        },
    )

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
        const { providerId, ...withoutProvider } = llm
        const { modelId, ...withoutModel } = llm

        expect(accepts(withoutProvider)).toBe(false)
        expect(accepts(withoutModel)).toBe(false)
    })

    test("requires kebab-case provider and model ids", () => {
        expect(accepts({ ...llm, providerId: "Anthropic" })).toBe(false)
        expect(accepts({ ...llm, modelId: "llama3.1:8b" })).toBe(false)
    })

    test("rejects a provider or a model on a human employee", () => {
        expect(accepts({ ...human, providerId: "anthropic" })).toBe(false)
        expect(accepts({ ...human, modelId: "claude-opus-5-5" })).toBe(false)
    })

    test("rejects an unknown key", () => {
        expect(accepts({ ...human, id: "omar" })).toBe(false)
    })
})
