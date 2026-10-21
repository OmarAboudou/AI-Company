import { requireCompany } from "../company/require-company.ts"
import { loadExistingPositionAssignment } from "./load-existing-position-assignment.ts"
import type { Position, Worker } from "./schema.ts"
import { savePositionState } from "./storage.ts"

export type UnassignPositionTemporarilyResult = {
    position: Position
    endedTemporaryAssignment: Worker | undefined
}

export async function unassignPositionTemporarily(
    projectRoot: string,
    rawId: string,
): Promise<UnassignPositionTemporarilyResult> {
    await requireCompany(projectRoot)
    const {
        position,
        state: { temporaryAssignment, ...otherState },
    } = await loadExistingPositionAssignment(projectRoot, rawId)
    if (temporaryAssignment !== undefined) {
        await savePositionState(projectRoot, position.id, otherState)
    }
    return { position, endedTemporaryAssignment: temporaryAssignment }
}
