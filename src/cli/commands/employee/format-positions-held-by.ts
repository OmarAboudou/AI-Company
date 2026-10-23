import { getPositionsHeldBy } from "../../../organization/employee/get-positions-held-by.ts"
import type { Position } from "../../../organization/position/schema.ts"

export function formatPositionsHeldBy(
    positions: Position[],
    employeeId: string,
): string {
    const positionIds = getPositionsHeldBy(positions, employeeId).map(
        ({ id }) => id,
    )
    return positionIds.length > 0 ? positionIds.join(", ") : "(none)"
}
