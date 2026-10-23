import { requireCompany } from "../company/require-company.ts"
import { listPositionAssignments } from "../position/list-position-assignments.ts"
import type { Position } from "../position/schema.ts"
import { getPositionsWorkedByDirectors } from "./get-positions-worked-by-directors.ts"
import { requireWorkedPosition } from "./require-worked-position.ts"

export async function setCurrentPosition(
    projectRoot: string,
    rawPositionId: string,
): Promise<Position> {
    await requireCompany(projectRoot)
    const assignments = await listPositionAssignments(projectRoot)
    const workedAssignments = getPositionsWorkedByDirectors(assignments)
    return requireWorkedPosition(
        projectRoot,
        workedAssignments.map(({ position }) => position),
        rawPositionId,
    )
}
