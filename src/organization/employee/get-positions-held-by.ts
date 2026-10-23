import type { Position } from "../position/schema.ts"

export function getPositionsHeldBy(
    positions: Position[],
    employeeId: string,
): Position[] {
    return positions.filter((position) => position.employeeId === employeeId)
}
