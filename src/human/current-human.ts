import { projectRoot } from "../cli-helpers.ts"
import type { Employee } from "../employee/employee.ts"
import { employeeExists, loadEmployee } from "../employee/storage.ts"
import { UserError } from "../errors.ts"
import { IdSchema } from "../id.ts"
import type { Position, Worker } from "../position/position.ts"
import { loadPositionState } from "../position/storage.ts"
import { currentWorker } from "../position/worker.ts"

export type CurrentHuman =
    | { kind: "director" }
    | { kind: "employee"; employee: Extract<Employee, { kind: "human" }> }

export type WorkedPosition = { position: Position; temporarily: boolean }

function employeeIdFromEnvironment(): string | undefined {
    const rawId = process.env.LLMCO_CURRENT_HUMAN_ID
    if (rawId === undefined || rawId === "") {
        return undefined
    }
    if (!IdSchema.safeParse(rawId).success) {
        throw new UserError(
            `LLMCO_CURRENT_HUMAN_ID is "${rawId}", which isn't an employee id. Unset it to act as a director.`,
        )
    }
    return rawId
}

export async function currentHuman(): Promise<CurrentHuman> {
    const id = employeeIdFromEnvironment()
    if (id === undefined) {
        return { kind: "director" }
    }
    if (!(await employeeExists(projectRoot, id))) {
        throw new UserError(
            `LLMCO_CURRENT_HUMAN_ID names no employee: "${id}". Run \`llmco employee list\`, or unset it to act as a director.`,
        )
    }
    const employee = await loadEmployee(projectRoot, id)
    if (employee.kind !== "human") {
        throw new UserError(
            `LLMCO_CURRENT_HUMAN_ID names "${id}", an LLM employee: only a human employee can be at the keyboard. Unset it to act as a director.`,
        )
    }
    return { kind: "employee", employee }
}

function isWorkedBy(human: CurrentHuman, worker: Worker | undefined): boolean {
    if (human.kind === "director") {
        return worker?.kind === "directors"
    }
    return (
        worker?.kind === "employee" && worker.employeeId === human.employee.id
    )
}

export async function positionsWorkedBy(
    human: CurrentHuman,
    positions: Position[],
    directorPositionId: string,
): Promise<WorkedPosition[]> {
    const workers = await Promise.all(
        positions.map(async (position) => {
            const state = await loadPositionState(projectRoot, position.id)
            return {
                position,
                temporarily: state.temporaryAssignment !== undefined,
                worker: currentWorker(position, state, directorPositionId),
            }
        }),
    )
    return workers
        .filter(({ worker }) => isWorkedBy(human, worker))
        .map(({ position, temporarily }) => ({ position, temporarily }))
}
