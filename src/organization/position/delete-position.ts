import { requireCompany } from "../../company/require-company.ts"
import { loadCompany } from "../../company/storage.ts"
import { readArchives } from "../../thread/archives.ts"
import { awaitedIds } from "../../thread/members.ts"
import { UserError } from "../../user-error.ts"
import { loadExistingPosition } from "./load-existing-position.ts"
import type { Position } from "./schema.ts"
import {
    deletePositionFolder,
    deletePositionState,
    listPositions,
} from "./storage.ts"

export async function deletePosition(
    projectRoot: string,
    rawId: string,
    { shouldForce = false }: { shouldForce?: boolean } = {},
): Promise<{ position: Position; awaitingThreadIds: string[] }> {
    await requireCompany(projectRoot)
    const [position, company, positions, archives] = await Promise.all([
        loadExistingPosition(projectRoot, rawId),
        loadCompany(projectRoot),
        listPositions(projectRoot),
        readArchives(projectRoot),
    ])
    if (company.directorPositionId === position.id) {
        throw new UserError(
            `Position "${position.id}" is the director's position: it can't be deleted.`,
        )
    }
    const awaitingThreadIds = archives
        .filter(({ thread, messages }) =>
            awaitedIds(thread, messages, positions).includes(position.id),
        )
        .map(({ thread }) => thread.id)
    if (awaitingThreadIds.length > 0 && !shouldForce) {
        throw new UserError(
            `Position "${position.id}" is awaited in these threads: ${awaitingThreadIds.join(", ")}. Add --force to delete it anyway; they will keep awaiting it.`,
        )
    }
    await Promise.all([
        deletePositionFolder(projectRoot, position.id),
        deletePositionState(projectRoot, position.id),
    ])
    return { position, awaitingThreadIds }
}
