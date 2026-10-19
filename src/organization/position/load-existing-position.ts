import { parseId } from "../../ids/parse-id.ts"
import { UserError } from "../../user-error.ts"
import type { Position } from "./schema.ts"
import { hasPosition, loadPosition } from "./storage.ts"

export async function loadExistingPosition(
    projectRoot: string,
    rawId: string,
): Promise<Position> {
    const id = parseId("position", rawId)
    if (!(await hasPosition(projectRoot, id))) {
        throw new UserError(`No position "${id}". Run \`llmco position list\`.`)
    }
    return loadPosition(projectRoot, id)
}
