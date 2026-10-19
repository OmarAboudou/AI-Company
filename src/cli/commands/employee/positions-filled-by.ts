import { getPositionsFilledBy } from "../../../organization/employee/get-positions-filled-by.ts"
import type { Position } from "../../../organization/position/schema.ts"

export function positionsFilledBy(
    positions: Position[],
    employeeId: string,
): string {
    const ids = getPositionsFilledBy(positions, employeeId).map(({ id }) => id)
    return ids.length > 0 ? ids.join(", ") : "(none)"
}
