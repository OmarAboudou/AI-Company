import { describe, expect, test } from "bun:test"
import { PositionConfigSchema, PositionStateSchema } from "./schema.ts"

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

    test("accepts the id of the default employee", () => {
        const filledDeveloper = {
            ...developer,
            defaultEmployeeId: "claude-senior",
        }

        const config = PositionConfigSchema.parse(filledDeveloper)

        expect(config).toEqual(filledDeveloper)
    })

    test("rejects a default employee id that is not kebab-case", () => {
        const config = { ...developer, defaultEmployeeId: "Claude Senior" }

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

describe("PositionStateSchema", () => {
    function acceptsState(state: unknown): boolean {
        return PositionStateSchema.safeParse(state).success
    }

    test("accepts a position temporarily assigned to an employee", () => {
        const state = {
            temporaryAssignment: { kind: "employee", employeeId: "julie" },
        } as const

        expect(PositionStateSchema.parse(state)).toEqual(state)
    })

    test("accepts a position temporarily assigned to the directors", () => {
        const state = { temporaryAssignment: { kind: "directors" } } as const

        expect(PositionStateSchema.parse(state)).toEqual(state)
    })

    test("accepts an employee whose id is directors", () => {
        const state = {
            temporaryAssignment: { kind: "employee", employeeId: "directors" },
        } as const

        expect(PositionStateSchema.parse(state)).toEqual(state)
    })

    test("accepts a state without temporary assignment", () => {
        expect(PositionStateSchema.parse({})).toEqual({})
    })

    test("requires an employee id for an employee only", () => {
        const employeeWithoutId = { kind: "employee" }
        const directorsWithEmployeeId = {
            kind: "directors",
            employeeId: "julie",
        }

        const employeeState = { temporaryAssignment: employeeWithoutId }
        const directorsState = { temporaryAssignment: directorsWithEmployeeId }

        expect(acceptsState(employeeState)).toBe(false)
        expect(acceptsState(directorsState)).toBe(false)
    })

    test("rejects an unknown kind or key", () => {
        const unknownKindState = { temporaryAssignment: { kind: "team" } }
        const datedState = {
            temporaryAssignment: { kind: "directors", since: "" },
        }

        expect(acceptsState(unknownKindState)).toBe(false)
        expect(acceptsState(datedState)).toBe(false)
    })
})
