import { describe, expect, test } from "bun:test"
import { UserError } from "../../user-error.ts"
import { parseTicketNumber } from "./parse-ticket-number.ts"

describe("parseTicketNumber", () => {
    test.each([
        ["3", 3],
        ["#12", 12],
    ])("reads %p as ticket %d", (rawNumber, ticketNumber) => {
        expect(parseTicketNumber(rawNumber)).toBe(ticketNumber)
    })

    test.each(["0", "#", "3a", "-1", "03"])("refuses %p", (rawNumber) => {
        const parsing = () => parseTicketNumber(rawNumber)

        expect(parsing).toThrow(UserError)
        expect(parsing).toThrow("e.g. 3 or #3")
    })
})
