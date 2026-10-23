import { describe, expect, test } from "bun:test"
import { PositionConfigSchema, WorkerSchema } from "./schema.ts"

const developer = { title: "Developer" }

function accepts(config: unknown): boolean {
    return PositionConfigSchema.safeParse(config).success
}

describe("PositionConfigSchema", () => {
    test("accepts a config with a title", () => {
        expect(PositionConfigSchema.parse(developer)).toEqual(developer)
    })

    test("trims whitespace around the title", () => {
        const config = PositionConfigSchema.parse({ title: " Developer " })

        expect(config.title).toBe("Developer")
    })

    test("rejects an empty or whitespace-only title", () => {
        expect(accepts({ title: "" })).toBe(false)
        expect(accepts({ title: "   " })).toBe(false)
    })

    test("accepts the id of the employee holding the position", () => {
        const heldDeveloper = { ...developer, employeeId: "claude-senior" }

        const config = PositionConfigSchema.parse(heldDeveloper)

        expect(config).toEqual(heldDeveloper)
    })

    test("rejects an employee id that is not kebab-case", () => {
        const config = { ...developer, employeeId: "Claude Senior" }

        expect(accepts(config)).toBe(false)
    })

    test("rejects the id history, kept in history.json", () => {
        const createdAt = "2026-10-18T14:00:00.000Z"

        expect(accepts({ ...developer, createdAt })).toBe(false)
    })

    test("rejects an unknown key", () => {
        expect(accepts({ ...developer, id: "dev" })).toBe(false)
    })
})

describe("WorkerSchema", () => {
    function acceptsWorker(worker: unknown): boolean {
        return WorkerSchema.safeParse(worker).success
    }

    test("accepts an employee, or the directors", () => {
        const julie = { kind: "employee", employeeId: "julie" } as const
        const directors = { kind: "directors" } as const

        expect(WorkerSchema.parse(julie)).toEqual(julie)
        expect(WorkerSchema.parse(directors)).toEqual(directors)
    })

    test("requires an employee id for an employee only", () => {
        expect(acceptsWorker({ kind: "employee" })).toBe(false)
        expect(acceptsWorker({ kind: "directors", employeeId: "julie" })).toBe(
            false,
        )
    })

    test("rejects an unknown kind or key", () => {
        expect(acceptsWorker({ kind: "team" })).toBe(false)
        expect(acceptsWorker({ kind: "directors", since: "" })).toBe(false)
    })
})
