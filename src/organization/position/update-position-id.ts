import { requireCompany } from "../../company/require-company.ts"
import { loadCompany, saveCompany } from "../../company/storage.ts"
import { getRenamedEntity } from "../../ids/get-renamed-entity.ts"
import { parseId } from "../../ids/parse-id.ts"
import { UserError } from "../../user-error.ts"
import { loadExistingPosition } from "./load-existing-position.ts"
import type { Position } from "./schema.ts"
import {
    copyPositionFolder,
    deletePositionFolder,
    deletePositionState,
    hasPosition,
    loadPositionState,
    savePosition,
    savePositionState,
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
    const [position, isTaken, company, state] = await Promise.all([
        loadExistingPosition(projectRoot, rawId),
        hasPosition(projectRoot, newId),
        loadCompany(projectRoot),
        loadPositionState(projectRoot, parseId("position", rawId)),
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
    // the company must never name a missing director's position.
    await copyPositionFolder(projectRoot, position.id, newId)
    await Promise.all([
        savePosition(projectRoot, renamedPosition),
        savePositionState(projectRoot, newId, state),
    ])
    if (company.directorPositionId === position.id) {
        await saveCompany(projectRoot, {
            ...company,
            directorPositionId: newId,
        })
    }
    await Promise.all([
        deletePositionFolder(projectRoot, position.id),
        deletePositionState(projectRoot, position.id),
    ])
    return { position, renamedPosition }
}
