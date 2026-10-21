import { loadJournal } from "../../journal/storage.ts"
import { UserError } from "../../user-error.ts"
import { loadPendingPositionIdsByThread } from "../../work/task/load-pending-position-ids-by-thread.ts"
import { requireCompany } from "../company/require-company.ts"
import { loadCompany } from "../company/storage.ts"
import { loadExistingPosition } from "./load-existing-position.ts"
import type { Position } from "./schema.ts"
import { deletePositionFolder, deletePositionState } from "./storage.ts"

export type DeletePositionResult = {
    position: Position
    pendingThreadIds: string[]
}

export async function deletePosition(
    projectRoot: string,
    rawId: string,
    { shouldForce = false }: { shouldForce?: boolean } = {},
): Promise<DeletePositionResult> {
    await requireCompany(projectRoot)
    const [position, company, journal] = await Promise.all([
        loadExistingPosition(projectRoot, rawId),
        loadCompany(projectRoot),
        loadJournal(projectRoot),
    ])
    const pendingPositionIdsByThread =
        await loadPendingPositionIdsByThread(journal)
    if (company.directorPositionId === position.id) {
        throw new UserError(
            `Position "${position.id}" is the director's position: it can't be deleted.`,
        )
    }
    const pendingThreadIds = [...pendingPositionIdsByThread]
        .filter(([, positionIds]) => positionIds.includes(position.id))
        .map(([threadId]) => threadId)
    if (pendingThreadIds.length > 0 && !shouldForce) {
        throw new UserError(
            `Position "${position.id}" has tasks pending in these threads: ${pendingThreadIds.join(", ")}. Add --force to delete it anyway; its tasks will wait for a position that no longer exists.`,
        )
    }
    await Promise.all([
        deletePositionFolder(projectRoot, position.id),
        deletePositionState(projectRoot, position.id),
    ])
    return { position, pendingThreadIds }
}
