import { describe, expect, test } from "bun:test"
import { readMonotonicTime } from "./read-monotonic-time.ts"

describe("readMonotonicTime", () => {
    test("is never earlier than the clock", () => {
        const clockTime = Date.now()

        const time = Date.parse(readMonotonicTime())

        expect(time).toBeGreaterThanOrEqual(clockTime)
    })

    test("is later at each reading, even within a millisecond", () => {
        const times = Array.from({ length: 20 }, readMonotonicTime)

        expect(new Set(times).size).toBe(20)
        expect(times).toEqual(times.toSorted())
    })
})
