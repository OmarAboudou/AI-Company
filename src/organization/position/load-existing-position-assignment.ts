import { loadCompany } from "../company/storage.ts"
import { getPositionAssignment } from "./get-position-assignment.ts"
import { loadExistingPosition } from "./load-existing-position.ts"
import type { PositionAssignment } from "./schema.ts"
import { loadPositionState } from "./storage.ts"

export async function loadExistingPositionAssignment(
    projectRoot: string,
    rawId: string,
): Promise<PositionAssignment> {
    const position = await loadExistingPosition(projectRoot, rawId)
    const [state, { directorPositionId }] = await Promise.all([
        loadPositionState(projectRoot, position.id),
        loadCompany(projectRoot),
    ])
    return getPositionAssignment(position, state, directorPositionId)
}
