import type { Position, PositionAssignment, Worker } from "./schema.ts"

export function getPositionAssignment(
    position: Position,
    directorPositionId: string,
): PositionAssignment {
    const isDirectorPosition = position.id === directorPositionId
    const { employeeId } = position
    const holder: Worker =
        isDirectorPosition || employeeId === undefined
            ? { kind: "user" }
            : { kind: "employee", employeeId }
    return { position, isDirectorPosition, holder }
}
