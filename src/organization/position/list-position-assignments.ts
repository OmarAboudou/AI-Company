import { loadCompany } from "../company/storage.ts"
import { getPositionAssignment } from "./get-position-assignment.ts"
import type { PositionAssignment } from "./schema.ts"
import { listPositions } from "./storage.ts"

export async function listPositionAssignments(
    projectRoot: string,
): Promise<PositionAssignment[]> {
    const [positions, { founderPositionId }] = await Promise.all([
        listPositions(projectRoot),
        loadCompany(projectRoot),
    ])
    return positions.map((position) =>
        getPositionAssignment(position, founderPositionId),
    )
}
