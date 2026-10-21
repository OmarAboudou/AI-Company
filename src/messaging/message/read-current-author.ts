import { readGitCommitter } from "../../git/read-git-committer.ts"
import { loadCompany } from "../../organization/company/storage.ts"
import type { Employee } from "../../organization/employee/schema.ts"
import { getPositionsWorkedBy } from "../../organization/human/get-positions-worked-by.ts"
import {
    type CurrentHuman,
    readCurrentHuman,
} from "../../organization/human/read-current-human.ts"
import { readCurrentPositionId } from "../../organization/human/read-current-position-id.ts"
import { requireWorkedPosition } from "../../organization/human/require-worked-position.ts"
import { listPositionAssignments } from "../../organization/position/list-position-assignments.ts"
import type { Position } from "../../organization/position/schema.ts"
import { loadPosition } from "../../organization/position/storage.ts"
import { UserError } from "../../user-error.ts"
import { getMemberIds } from "../thread/get-member-ids.ts"
import type { Archive } from "../thread/list-archives.ts"
import type { Author } from "./schema.ts"

function getOnlyItem<Item>(items: Item[]): Item | undefined {
    return items.length === 1 ? items[0] : undefined
}

function requireOnlyPosition(
    employee: Employee,
    workedPositions: Position[],
): Position {
    const position = getOnlyItem(workedPositions)
    if (position !== undefined) {
        return position
    }
    const employeeDescription = `${employee.name} (${employee.id})`
    if (workedPositions.length === 0) {
        throw new UserError(
            `${employeeDescription} works no position to write from. A director can assign one temporarily: \`llmco position assign-temporarily employee <position-id> ${employee.id}\`.`,
        )
    }
    throw new UserError(
        `${employeeDescription} works several positions, ${workedPositions.map(({ id }) => id).join(", ")}: llmco can't tell which one to write from. Choose one with --as-position.`,
    )
}

type PositionChoice = {
    human: CurrentHuman
    workedPositions: Position[]
    currentPositionId: string | undefined
    threadMemberIds: string[]
    directorPositionId: string
}

function requireSelectedPosition(
    workedPositions: Position[],
    currentPositionId: string,
): Position {
    const position = workedPositions.find(({ id }) => id === currentPositionId)
    if (position === undefined) {
        throw new UserError(
            `The position selected in this shell, "${currentPositionId}", isn't one you work now. Select another with \`llmco current-position set <position-id>\`, or run \`llmco current-position clear\`.`,
        )
    }
    return position
}

async function loadPositionToWriteFrom(
    projectRoot: string,
    {
        human,
        workedPositions,
        currentPositionId,
        threadMemberIds,
        directorPositionId,
    }: PositionChoice,
    asPositionId: string | undefined,
): Promise<Position> {
    if (asPositionId !== undefined) {
        return requireWorkedPosition(
            projectRoot,
            human,
            workedPositions,
            asPositionId,
        )
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
    return human.kind === "director"
        ? loadPosition(projectRoot, directorPositionId)
        : requireOnlyPosition(human.employee, workedPositions)
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
    const [human, assignments, { directorPositionId }] = await Promise.all([
        readCurrentHuman(projectRoot, environment),
        listPositionAssignments(projectRoot),
        loadCompany(projectRoot),
    ])
    const positions = assignments.map(({ position }) => position)
    const workedAssignments = getPositionsWorkedBy(assignments, human)
    const positionChoice = {
        human,
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
        ...(human.kind === "employee" && {
            employee: { id: human.employee.id, name: human.employee.name },
        }),
        committer: readGitCommitter(projectRoot),
    }
}
