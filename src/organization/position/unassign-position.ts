import { requireCompany } from "../company/require-company.ts"
import { loadExistingPositionAssignment } from "./load-existing-position-assignment.ts"
import type { Worker } from "./schema.ts"
import { savePosition } from "./storage.ts"

export type UnassignPositionResult = {
    positionId: string
    previousEmployeeId: string | undefined
    temporaryAssignment: Worker | undefined
}

export async function unassignPosition(
    projectRoot: string,
    rawId: string,
): Promise<UnassignPositionResult> {
    await requireCompany(projectRoot)
    const { position, state } = await loadExistingPositionAssignment(
        projectRoot,
        rawId,
    )
    const { defaultEmployeeId, ...vacantPosition } = position
    if (defaultEmployeeId !== undefined) {
        await savePosition(projectRoot, vacantPosition)
    }
    return {
        positionId: vacantPosition.id,
        previousEmployeeId: defaultEmployeeId,
        temporaryAssignment: state.temporaryAssignment,
    }
}
