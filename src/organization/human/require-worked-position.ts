import { UserError } from "../../user-error.ts"
import { loadEmployee } from "../employee/storage.ts"
import { loadExistingPositionAssignment } from "../position/load-existing-position-assignment.ts"
import type { Position, Worker } from "../position/schema.ts"
import type { CurrentHuman } from "./read-current-human.ts"

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

export async function requireWorkedPosition(
    projectRoot: string,
    human: CurrentHuman,
    workedPositions: Position[],
    rawId: string,
): Promise<Position> {
    const { position, isDirectorPosition, currentWorker } =
        await loadExistingPositionAssignment(projectRoot, rawId)
    if (workedPositions.some(({ id }) => id === position.id)) {
        return position
    }
    if (isDirectorPosition) {
        throw new UserError(
            `Only directors write from the director's position "${position.id}": run \`llmco current-human clear\` to act as one.`,
        )
    }
    throw new UserError(
        `You don't work position "${position.id}": ${await loadWorkerDescription(projectRoot, currentWorker)}. ${formatHowToWorkIt(human, position)}`,
    )
}
