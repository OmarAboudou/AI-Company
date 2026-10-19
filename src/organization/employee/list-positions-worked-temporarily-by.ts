import type { Position, PositionState } from "../position/schema.ts"
import { loadPositionState } from "../position/storage.ts"

export type TemporaryPosition = { position: Position; state: PositionState }

export async function listPositionsWorkedTemporarilyBy(
    projectRoot: string,
    positions: Position[],
    employeeId: string,
): Promise<TemporaryPosition[]> {
    const positionsAndStates = await Promise.all(
        positions.map(async (position) => ({
            position,
            state: await loadPositionState(projectRoot, position.id),
        })),
    )
    return positionsAndStates.filter(
        ({ state: { temporaryAssignment: worker } }) =>
            worker?.kind === "employee" && worker.employeeId === employeeId,
    )
}
