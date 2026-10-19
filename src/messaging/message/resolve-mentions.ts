import { listPositions } from "../../organization/position/storage.ts"
import { findMentions } from "./find-mentions.ts"
import type { Draft } from "./schema.ts"

export async function resolveMentions(
    projectRoot: string,
    body: string,
    authorPositionId: string,
): Promise<Pick<Draft, "mentions" | "unknownMentionIds">> {
    const { positionIds } = findMentions(body)
    const positions = await listPositions(projectRoot)
    const knownPositionIds = new Set(positions.map(({ id }) => id))
    return {
        mentions: positionIds.filter(
            (id) => knownPositionIds.has(id) && id !== authorPositionId,
        ),
        unknownMentionIds: positionIds.filter(
            (id) => !knownPositionIds.has(id),
        ),
    }
}
