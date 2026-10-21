import { getPositionAssignment } from "../position/get-position-assignment.ts"
import type { Position, Worker } from "../position/schema.ts"
import { loadPositionState } from "../position/storage.ts"
import type { CurrentHuman } from "./read-current-human.ts"

export type WorkedPosition = { position: Position; isTemporary: boolean }

function isWorkedBy(human: CurrentHuman, worker: Worker | undefined): boolean {
    if (human.kind === "director") {
        return worker?.kind === "directors"
    }
    return (
        worker?.kind === "employee" && worker.employeeId === human.employee.id
    )
}

export async function listPositionsWorkedBy(
    projectRoot: string,
    human: CurrentHuman,
    positions: Position[],
    directorPositionId: string,
): Promise<WorkedPosition[]> {
    const positionsAndWorkers = await Promise.all(
        positions.map(async (position) => {
            const state = await loadPositionState(projectRoot, position.id)
            return {
                position,
                isTemporary: state.temporaryAssignment !== undefined,
                worker: getPositionAssignment(
                    position,
                    state,
                    directorPositionId,
                ).currentWorker,
            }
        }),
    )
    return positionsAndWorkers
        .filter(({ worker }) => isWorkedBy(human, worker))
        .map(({ position, isTemporary }) => ({ position, isTemporary }))
}
