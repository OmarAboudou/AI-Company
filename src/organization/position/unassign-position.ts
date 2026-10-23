import { requireCompany } from "../company/require-company.ts"
import { loadExistingPositionAssignment } from "./load-existing-position-assignment.ts"
import { savePosition } from "./storage.ts"

export type UnassignPositionResult = {
    positionId: string
    previousEmployeeId: string | undefined
}

export async function unassignPosition(
    projectRoot: string,
    rawId: string,
): Promise<UnassignPositionResult> {
    await requireCompany(projectRoot)
    const { position } = await loadExistingPositionAssignment(
        projectRoot,
        rawId,
    )
    const { employeeId, ...positionHeldByDirectors } = position
    if (employeeId !== undefined) {
        await savePosition(projectRoot, positionHeldByDirectors)
    }
    return { positionId: position.id, previousEmployeeId: employeeId }
}
