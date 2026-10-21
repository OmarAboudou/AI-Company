import { describe, expect, test } from "bun:test"
import { builtInEventTypes } from "./built-in-event-types.ts"

describe("builtInEventTypes", () => {
    test("names each type of event once", () => {
        const typeNames = builtInEventTypes.map(({ type }) => type)

        expect(new Set(typeNames).size).toBe(typeNames.length)
    })
})
