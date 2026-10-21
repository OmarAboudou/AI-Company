import { requireCompany } from "../company/require-company.ts"
import { listPositionAssignments } from "../position/list-position-assignments.ts"
import type { Position } from "../position/schema.ts"
import { getPositionsWorkedBy } from "./get-positions-worked-by.ts"
import { readCurrentHuman } from "./read-current-human.ts"
import { requireWorkedPosition } from "./require-worked-position.ts"

export async function setCurrentPosition(
    projectRoot: string,
    environment: NodeJS.ProcessEnv,
    rawPositionId: string,
): Promise<Position> {
    await requireCompany(projectRoot)
    const [human, assignments] = await Promise.all([
        readCurrentHuman(projectRoot, environment),
        listPositionAssignments(projectRoot),
    ])
    const workedAssignments = getPositionsWorkedBy(assignments, human)
    return requireWorkedPosition(
        projectRoot,
        human,
        workedAssignments.map(({ position }) => position),
        rawPositionId,
    )
}
