import type { Position, PositionAssignment, Worker } from "./schema.ts"

export function getPositionAssignment(
    position: Position,
    founderPositionId: string,
): PositionAssignment {
    const isFounderPosition = position.id === founderPositionId
    const { employeeId } = position
    const holder: Worker =
        isFounderPosition || employeeId === undefined
            ? { kind: "user" }
            : { kind: "employee", employeeId }
    return { position, isFounderPosition, holder }
}
