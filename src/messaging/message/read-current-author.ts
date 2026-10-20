import { readGitCommitter } from "../../git/read-git-committer.ts"
import { loadCompany } from "../../organization/company/storage.ts"
import type { Employee } from "../../organization/employee/schema.ts"
import { loadEmployee } from "../../organization/employee/storage.ts"
import { listPositionsWorkedBy } from "../../organization/human/list-positions-worked-by.ts"
import {
    type CurrentHuman,
    readCurrentHuman,
} from "../../organization/human/read-current-human.ts"
import { getCurrentWorker } from "../../organization/position/get-current-worker.ts"
import { loadExistingPosition } from "../../organization/position/load-existing-position.ts"
import type { Position, Worker } from "../../organization/position/schema.ts"
import {
    listPositions,
    loadPosition,
    loadPositionState,
} from "../../organization/position/storage.ts"
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

async function loadWorkerDescription(
    projectRoot: string,
    worker: Worker | undefined,
): Promise<string> {
    if (worker === undefined) {
        return "it is vacant"
    }
    if (worker.kind === "directors") {
        return "the directors work it"
    }
    const employee = await loadEmployee(projectRoot, worker.employeeId)
    return employee.kind === "llm"
        ? `${employee.name}, an LLM employee, works it, and nobody writes on an LLM's behalf`
        : `${employee.name}, a human employee, works it`
}

function formatHowToWorkIt(human: CurrentHuman, position: Position): string {
    if (human.kind === "director") {
        return `Assign it to the directors temporarily first: \`llmco position assign-temporarily directors ${position.id}\`.`
    }
    const { id } = human.employee
    return position.defaultEmployeeId === id
        ? `A director can give it back to ${id}: \`llmco position unassign-temporarily ${position.id}\`.`
        : `A director can assign it to ${id} temporarily: \`llmco position assign-temporarily employee ${position.id} ${id}\`.`
}

async function requireWorkedPosition(
    projectRoot: string,
    human: CurrentHuman,
    workedPositions: Position[],
    rawId: string,
    directorPositionId: string,
): Promise<Position> {
    const position = await loadExistingPosition(projectRoot, rawId)
    if (workedPositions.some(({ id }) => id === position.id)) {
        return position
    }
    if (position.id === directorPositionId) {
        throw new UserError(
            `Only directors write from the director's position "${position.id}": run \`llmco current-human clear\` to act as one.`,
        )
    }
    const positionState = await loadPositionState(projectRoot, position.id)
    const worker = getCurrentWorker(position, positionState, directorPositionId)
    throw new UserError(
        `You don't work position "${position.id}": ${await loadWorkerDescription(projectRoot, worker)}. ${formatHowToWorkIt(human, position)}`,
    )
}

type PositionChoice = {
    human: CurrentHuman
    workedPositions: Position[]
    threadMemberIds: string[]
    directorPositionId: string
}

async function loadPositionToWriteFrom(
    projectRoot: string,
    {
        human,
        workedPositions,
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
            directorPositionId,
        )
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
    {
        archive,
        asPositionId,
    }: {
        archive?: Archive
        asPositionId?: string
    } = {},
): Promise<Author> {
    const [human, positions, { directorPositionId }] = await Promise.all([
        readCurrentHuman(projectRoot),
        listPositions(projectRoot),
        loadCompany(projectRoot),
    ])
    const workedPositions = await listPositionsWorkedBy(
        projectRoot,
        human,
        positions,
        directorPositionId,
    )
    const positionChoice = {
        human,
        workedPositions: workedPositions.map(({ position }) => position),
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
