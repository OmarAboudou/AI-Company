import { describe, expect, test } from "bun:test"
import { getDefinedValues } from "./get-defined-values.ts"

describe("getDefinedValues", () => {
    test("keeps only the keys whose value is defined", () => {
        const changes = { name: "Julie", providerId: undefined, modelId: "" }

        const definedChanges = getDefinedValues(changes)

        expect(definedChanges).toEqual({ name: "Julie", modelId: "" })
    })
})
