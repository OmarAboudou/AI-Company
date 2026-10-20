import { requireCompany } from "../company/require-company.ts"
import { loadCompany } from "../company/storage.ts"
import type { Position } from "../position/schema.ts"
import { listPositions } from "../position/storage.ts"
import { listPositionsWorkedBy } from "./list-positions-worked-by.ts"
import { readCurrentHuman } from "./read-current-human.ts"
import { requireWorkedPosition } from "./require-worked-position.ts"

export async function setCurrentPosition(
    projectRoot: string,
    rawPositionId: string,
): Promise<Position> {
    await requireCompany(projectRoot)
    const [human, positions, { directorPositionId }] = await Promise.all([
        readCurrentHuman(projectRoot),
        listPositions(projectRoot),
        loadCompany(projectRoot),
    ])
    const workedPositions = await listPositionsWorkedBy(
        projectRoot,
        human,
        positions,
        directorPositionId,
    )
    return requireWorkedPosition(
        projectRoot,
        human,
        workedPositions.map(({ position }) => position),
        rawPositionId,
        directorPositionId,
    )
}
