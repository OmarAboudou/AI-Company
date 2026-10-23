import { getRenamedEntity } from "../../ids/get-renamed-entity.ts"
import { parseId } from "../../ids/parse-id.ts"
import { UserError } from "../../user-error.ts"
import { requireCompany } from "../company/require-company.ts"
import { loadCompany, saveCompany } from "../company/storage.ts"
import { loadExistingPositionAssignment } from "./load-existing-position-assignment.ts"
import type { Position } from "./schema.ts"
import {
    copyPositionFolder,
    deletePositionFolder,
    hasPosition,
    savePosition,
} from "./storage.ts"

export type UpdatePositionIdResult = {
    position: Position
    renamedPosition: Position
}

export async function updatePositionId(
    projectRoot: string,
    rawId: string,
    rawNewId: string,
): Promise<UpdatePositionIdResult> {
    await requireCompany(projectRoot)
    const newId = parseId("position", rawNewId)
    const [{ position, isFounderPosition }, isTaken] = await Promise.all([
        loadExistingPositionAssignment(projectRoot, rawId),
        hasPosition(projectRoot, newId),
    ])
    if (isTaken) {
        throw new UserError(`Position "${newId}" already exists.`)
    }
    const renamedPosition = getRenamedEntity(
        position,
        newId,
        new Date().toISOString(),
    )
    // Copy, repoint, then delete rather than move, as for employees:
    // the company must never name a missing founder's position.
    await copyPositionFolder(projectRoot, position.id, newId)
    await savePosition(projectRoot, renamedPosition)
    if (isFounderPosition) {
        const company = await loadCompany(projectRoot)
        await saveCompany(projectRoot, {
            ...company,
            founderPositionId: newId,
        })
    }
    await deletePositionFolder(projectRoot, position.id)
    return { position, renamedPosition }
}
