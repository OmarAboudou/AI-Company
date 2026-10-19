import { requireCompany } from "../../company/require-company.ts"
import { parseId } from "../../ids/parse-id.ts"
import { loadExistingPosition } from "./load-existing-position.ts"
import type { Position, Worker } from "./schema.ts"
import { loadPositionState, savePositionState } from "./storage.ts"

export async function unassignPositionTemporarily(
    projectRoot: string,
    rawId: string,
): Promise<{
    position: Position
    endedTemporaryAssignment: Worker | undefined
}> {
    await requireCompany(projectRoot)
    const [position, { temporaryAssignment, ...otherState }] =
        await Promise.all([
            loadExistingPosition(projectRoot, rawId),
            loadPositionState(projectRoot, parseId("position", rawId)),
        ])
    if (temporaryAssignment !== undefined) {
        await savePositionState(projectRoot, position.id, otherState)
    }
    return { position, endedTemporaryAssignment: temporaryAssignment }
}
