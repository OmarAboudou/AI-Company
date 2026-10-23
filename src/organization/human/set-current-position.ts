import { requireCompany } from "../company/require-company.ts"
import type { Position } from "../position/schema.ts"
import { requireWorkedPosition } from "./require-worked-position.ts"

export async function setCurrentPosition(
    projectRoot: string,
    rawPositionId: string,
): Promise<Position> {
    await requireCompany(projectRoot)
    return requireWorkedPosition(projectRoot, rawPositionId)
}
