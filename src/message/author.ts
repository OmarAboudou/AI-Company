import { projectRoot } from "../cli/project-root.ts"
import { loadCompany } from "../company/storage.ts"
import { readGitCommitter } from "../git/read-git-committer.ts"
import type { Employee } from "../organization/employee/schema.ts"
import { loadEmployee } from "../organization/employee/storage.ts"
import { positionsWorkedBy } from "../organization/human/list-positions-worked-by.ts"
import {
    type CurrentHuman,
    currentHuman,
} from "../organization/human/read-current-human.ts"
import { getCurrentWorker } from "../organization/position/get-current-worker.ts"
import { loadExistingPosition } from "../organization/position/load-existing-position.ts"
import type { Position, Worker } from "../organization/position/schema.ts"
import {
    listPositions,
    loadPosition,
    loadPositionState,
} from "../organization/position/storage.ts"
import type { Archive } from "../thread/archives.ts"
import { memberIds } from "../thread/members.ts"
import { UserError } from "../user-error.ts"
import type { MessageConfig } from "./message.ts"

export type Author = Pick<MessageConfig, "position" | "employee" | "committer">

function only<Item>(items: Item[]): Item | undefined {
    return items.length === 1 ? items[0] : undefined
}

function onlyPositionOf(employee: Employee, worked: Position[]): Position {
    const position = only(worked)
    if (position !== undefined) {
        return position
    }
    const who = `${employee.name} (${employee.id})`
    if (worked.length === 0) {
        throw new UserError(
            `${who} works no position to write from. A director can assign one temporarily: \`llmco position assign-temporarily employee <position-id> ${employee.id}\`.`,
        )
    }
    throw new UserError(
        `${who} works several positions, ${worked.map(({ id }) => id).join(", ")}: llmco can't tell which one to write from. Choose one with --as-position.`,
    )
}

async function workerDescription(worker: Worker | undefined): Promise<string> {
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

function howToWorkIt(human: CurrentHuman, position: Position): string {
    if (human.kind === "director") {
        return `Assign it to the directors temporarily first: \`llmco position assign-temporarily directors ${position.id}\`.`
    }
    const { id } = human.employee
    return position.defaultEmployeeId === id
        ? `A director can give it back to ${id}: \`llmco position unassign-temporarily ${position.id}\`.`
        : `A director can assign it to ${id} temporarily: \`llmco position assign-temporarily employee ${position.id} ${id}\`.`
}

async function chosenPosition(
    human: CurrentHuman,
    worked: Position[],
    rawId: string,
    directorPositionId: string,
): Promise<Position> {
    const position = await loadExistingPosition(projectRoot, rawId)
    if (worked.some(({ id }) => id === position.id)) {
        return position
    }
    if (position.id === directorPositionId) {
        throw new UserError(
            `Only directors write from the director's position "${position.id}": unset LLMCO_CURRENT_HUMAN_ID to act as one.`,
        )
    }
    const state = await loadPositionState(projectRoot, position.id)
    const worker = getCurrentWorker(position, state, directorPositionId)
    throw new UserError(
        `You don't work position "${position.id}": ${await workerDescription(worker)}. ${howToWorkIt(human, position)}`,
    )
}

type Choice = {
    human: CurrentHuman
    worked: Position[]
    memberIds: string[]
    directorPositionId: string
}

async function positionToWriteFrom(
    { human, worked, memberIds, directorPositionId }: Choice,
    asPositionId: string | undefined,
): Promise<Position> {
    if (asPositionId !== undefined) {
        return chosenPosition(human, worked, asPositionId, directorPositionId)
    }
    const inThread = only(worked.filter(({ id }) => memberIds.includes(id)))
    if (inThread !== undefined) {
        return inThread
    }
    return human.kind === "director"
        ? loadPosition(projectRoot, directorPositionId)
        : onlyPositionOf(human.employee, worked)
}

export async function currentAuthor({
    archive,
    asPositionId,
}: {
    archive?: Archive
    asPositionId?: string
} = {}): Promise<Author> {
    const [human, positions, { directorPositionId }] = await Promise.all([
        currentHuman(),
        listPositions(projectRoot),
        loadCompany(projectRoot),
    ])
    const worked = await positionsWorkedBy(human, positions, directorPositionId)
    const choice = {
        human,
        worked: worked.map(({ position }) => position),
        memberIds:
            archive === undefined
                ? []
                : memberIds(archive.thread, archive.messages, positions),
        directorPositionId,
    }
    const position = await positionToWriteFrom(choice, asPositionId)
    return {
        position: { id: position.id, title: position.title },
        ...(human.kind === "employee" && {
            employee: { id: human.employee.id, name: human.employee.name },
        }),
        committer: readGitCommitter(projectRoot),
    }
}
