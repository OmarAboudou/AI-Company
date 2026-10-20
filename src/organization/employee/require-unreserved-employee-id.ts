import { UserError } from "../../user-error.ts"

const reservedEmployeeId = "director"

export function requireUnreservedEmployeeId(id: string): void {
    if (id === reservedEmployeeId) {
        throw new UserError(
            `Employee id "${id}" is reserved for the directors, whom the prompt shows as (${id}).`,
        )
    }
}
