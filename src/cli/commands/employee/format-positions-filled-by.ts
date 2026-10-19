import { getPositionsFilledBy } from "../../../organization/employee/get-positions-filled-by.ts"
import type { Position } from "../../../organization/position/schema.ts"

export function formatPositionsFilledBy(
    positions: Position[],
    employeeId: string,
): string {
    const positionIds = getPositionsFilledBy(positions, employeeId).map(
        ({ id }) => id,
    )
    return positionIds.length > 0 ? positionIds.join(", ") : "(none)"
}
