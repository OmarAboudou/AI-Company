import type { Position } from "../position/schema.ts"

export function getPositionsFilledBy(
    positions: Position[],
    employeeId: string,
): Position[] {
    return positions.filter(
        ({ defaultEmployeeId }) => defaultEmployeeId === employeeId,
    )
}
