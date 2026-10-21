import { loadCompany } from "../company/storage.ts"
import { getPositionAssignment } from "./get-position-assignment.ts"
import type { PositionAssignment } from "./schema.ts"
import { listPositions, loadPositionState } from "./storage.ts"

export async function listPositionAssignments(
    projectRoot: string,
): Promise<PositionAssignment[]> {
    const [positions, { directorPositionId }] = await Promise.all([
        listPositions(projectRoot),
        loadCompany(projectRoot),
    ])
    return Promise.all(
        positions.map(async (position) => {
            const state = await loadPositionState(projectRoot, position.id)
            return getPositionAssignment(position, state, directorPositionId)
        }),
    )
}
