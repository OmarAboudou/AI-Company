import type { Position, PositionState, Worker } from "./schema.ts"

export function getCurrentWorker(
    position: Position,
    { temporaryAssignment }: PositionState,
    directorPositionId: string,
): Worker | undefined {
    if (position.id === directorPositionId) {
        return { kind: "directors" }
    }
    if (temporaryAssignment !== undefined) {
        return temporaryAssignment
    }
    return position.defaultEmployeeId === undefined
        ? undefined
        : { kind: "employee", employeeId: position.defaultEmployeeId }
}
