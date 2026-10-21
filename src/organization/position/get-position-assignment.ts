import type {
    Position,
    PositionAssignment,
    PositionState,
    Worker,
} from "./schema.ts"

function getDefaultWorker({ defaultEmployeeId }: Position): Worker | undefined {
    return defaultEmployeeId === undefined
        ? undefined
        : { kind: "employee", employeeId: defaultEmployeeId }
}

export function getPositionAssignment(
    position: Position,
    state: PositionState,
    directorPositionId: string,
): PositionAssignment {
    const isDirectorPosition = position.id === directorPositionId
    const currentWorker: Worker | undefined = isDirectorPosition
        ? { kind: "directors" }
        : (state.temporaryAssignment ?? getDefaultWorker(position))
    return { position, isDirectorPosition, state, currentWorker }
}
