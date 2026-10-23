import { describe, expect, test } from "bun:test"
import { formatTicketNumbers } from "./format-ticket-numbers.ts"

describe("formatTicketNumbers", () => {
    test("writes each number after a #, separated by commas", () => {
        expect(formatTicketNumbers([1, 12])).toBe("#1, #12")
    })
})
