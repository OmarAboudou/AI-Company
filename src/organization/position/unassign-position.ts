import { requireCompany } from "../../company/require-company.ts"
import { parseId } from "../../ids/parse-id.ts"
import { loadExistingPosition } from "./load-existing-position.ts"
import type { Worker } from "./schema.ts"
import { loadPositionState, savePosition } from "./storage.ts"

export type PositionUnassignment = {
    positionId: string
    previousEmployeeId: string | undefined
    temporaryAssignment: Worker | undefined
}

export async function unassignPosition(
    projectRoot: string,
    rawId: string,
): Promise<PositionUnassignment> {
    await requireCompany(projectRoot)
    const [{ defaultEmployeeId, ...vacantPosition }, { temporaryAssignment }] =
        await Promise.all([
            loadExistingPosition(projectRoot, rawId),
            loadPositionState(projectRoot, parseId("position", rawId)),
        ])
    if (defaultEmployeeId !== undefined) {
        await savePosition(projectRoot, vacantPosition)
    }
    return {
        positionId: vacantPosition.id,
        previousEmployeeId: defaultEmployeeId,
        temporaryAssignment,
    }
}
