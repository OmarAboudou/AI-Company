import { readGitCommitter } from "../../git/read-git-committer.ts"
import { loadCompany } from "../../organization/company/storage.ts"
import { getPositionsWorkedByDirectors } from "../../organization/human/get-positions-worked-by-directors.ts"
import { readCurrentPositionId } from "../../organization/human/read-current-position-id.ts"
import { requireSelectedPosition } from "../../organization/human/require-selected-position.ts"
import { requireWorkedPosition } from "../../organization/human/require-worked-position.ts"
import { listPositionAssignments } from "../../organization/position/list-position-assignments.ts"
import type { Position } from "../../organization/position/schema.ts"
import { loadPosition } from "../../organization/position/storage.ts"
import { getMemberIds } from "../thread/get-member-ids.ts"
import type { Archive } from "../thread/list-archives.ts"
import type { Author } from "./schema.ts"

function getOnlyItem<Item>(items: Item[]): Item | undefined {
    return items.length === 1 ? items[0] : undefined
}

type PositionChoice = {
    workedPositions: Position[]
    currentPositionId: string | undefined
    threadMemberIds: string[]
    directorPositionId: string
}

async function loadPositionToWriteFrom(
    projectRoot: string,
    {
        workedPositions,
        currentPositionId,
        threadMemberIds,
        directorPositionId,
    }: PositionChoice,
    asPositionId: string | undefined,
): Promise<Position> {
    if (asPositionId !== undefined) {
        return requireWorkedPosition(projectRoot, workedPositions, asPositionId)
    }
    if (currentPositionId !== undefined) {
        return requireSelectedPosition(workedPositions, currentPositionId)
    }
    const positionInThread = getOnlyItem(
        workedPositions.filter(({ id }) => threadMemberIds.includes(id)),
    )
    if (positionInThread !== undefined) {
        return positionInThread
    }
    return loadPosition(projectRoot, directorPositionId)
}

export async function readCurrentAuthor(
    projectRoot: string,
    environment: NodeJS.ProcessEnv,
    {
        archive,
        asPositionId,
    }: {
        archive?: Archive
        asPositionId?: string
    } = {},
): Promise<Author> {
    const [assignments, { directorPositionId }] = await Promise.all([
        listPositionAssignments(projectRoot),
        loadCompany(projectRoot),
    ])
    const positions = assignments.map(({ position }) => position)
    const workedAssignments = getPositionsWorkedByDirectors(assignments)
    const positionChoice = {
        workedPositions: workedAssignments.map(({ position }) => position),
        currentPositionId: readCurrentPositionId(environment),
        threadMemberIds:
            archive === undefined
                ? []
                : getMemberIds(archive.thread, archive.messages, positions),
        directorPositionId,
    }
    const position = await loadPositionToWriteFrom(
        projectRoot,
        positionChoice,
        asPositionId,
    )
    return {
        position: { id: position.id, title: position.title },
        committer: readGitCommitter(projectRoot),
    }
}
