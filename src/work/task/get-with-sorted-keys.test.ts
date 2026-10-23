import { describe, expect, test } from "bun:test"
import { getWithSortedKeys } from "./get-with-sorted-keys.ts"

describe("getWithSortedKeys", () => {
    test("sorts an object's keys at every depth, keeping arrays' order", () => {
        const params = {
            ticketNumber: 3,
            entries: [{ to: 3, from: 1 }, 2],
        }

        const sortedParams = getWithSortedKeys(params)

        expect(JSON.stringify(sortedParams)).toBe(
            '{"entries":[{"from":1,"to":3},2],"ticketNumber":3}',
        )
    })

    test("gives back what isn't an object as it is", () => {
        expect(getWithSortedKeys("example")).toBe("example")
    })
})
