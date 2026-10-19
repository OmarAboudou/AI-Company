import { projectRoot } from "../../cli/project-root.ts"
import { listPositions } from "../../organization/position/storage.ts"
import { findMentions } from "./find-mentions.ts"
import type { Draft } from "./schema.ts"

export async function readMentions(
    body: string,
    authorPositionId: string,
): Promise<Pick<Draft, "mentions" | "unknownMentions">> {
    const { positionIds } = findMentions(body)
    const positions = await listPositions(projectRoot)
    const known = new Set(positions.map(({ id }) => id))
    return {
        mentions: positionIds.filter(
            (id) => known.has(id) && id !== authorPositionId,
        ),
        unknownMentions: positionIds.filter((id) => !known.has(id)),
    }
}
