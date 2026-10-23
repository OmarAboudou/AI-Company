import { loadCompany } from "../company/storage.ts"
import { getPositionAssignment } from "./get-position-assignment.ts"
import { loadExistingPosition } from "./load-existing-position.ts"
import type { PositionAssignment } from "./schema.ts"

export async function loadExistingPositionAssignment(
    projectRoot: string,
    rawId: string,
): Promise<PositionAssignment> {
    const [position, { directorPositionId }] = await Promise.all([
        loadExistingPosition(projectRoot, rawId),
        loadCompany(projectRoot),
    ])
    return getPositionAssignment(position, directorPositionId)
}
