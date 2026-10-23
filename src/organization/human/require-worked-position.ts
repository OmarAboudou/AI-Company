import { UserError } from "../../user-error.ts"
import { loadEmployee } from "../employee/storage.ts"
import { loadExistingPositionAssignment } from "../position/load-existing-position-assignment.ts"
import type { Position, Worker } from "../position/schema.ts"

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

export async function requireWorkedPosition(
    projectRoot: string,
    workedPositions: Position[],
    rawId: string,
): Promise<Position> {
    const { position, currentWorker } = await loadExistingPositionAssignment(
        projectRoot,
        rawId,
    )
    if (workedPositions.some(({ id }) => id === position.id)) {
        return position
    }
    throw new UserError(
        `You don't work position "${position.id}": ${await loadWorkerDescription(projectRoot, currentWorker)}. Assign it to the directors temporarily first: \`aico position assign-temporarily directors ${position.id}\`.`,
    )
}
