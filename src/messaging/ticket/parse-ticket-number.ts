import { UserError } from "../../user-error.ts"

export function parseTicketNumber(rawNumber: string): number {
    const digits = rawNumber.startsWith("#") ? rawNumber.slice(1) : rawNumber
    if (!/^[1-9]\d*$/.test(digits)) {
        throw new UserError(
            `Invalid ticket number "${rawNumber}": give a number from 1, e.g. 3 or #3.`,
        )
    }
    return Number(digits)
}
