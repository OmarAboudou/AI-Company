import type { CommandUnknownOpts } from "@commander-js/extra-typings"
import { projectRoot } from "../cli/project-root.ts"
import { IdSchema } from "../ids/id-schema.ts"
import type { Employee } from "../organization/employee/schema.ts"
import { hasEmployee, loadEmployee } from "../organization/employee/storage.ts"
import { getCurrentWorker } from "../organization/position/get-current-worker.ts"
import type { Position, Worker } from "../organization/position/schema.ts"
import { loadPositionState } from "../organization/position/storage.ts"
import { UserError } from "../user-error.ts"

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

function commandPath(command: CommandUnknownOpts): string {
    const names: string[] = []
    for (
        let next: CommandUnknownOpts | null = command;
        next;
        next = next.parent
    ) {
        names.unshift(next.name())
    }
    return names.join(" ")
}

export function requireDirector(
    _: unknown,
    actionCommand: CommandUnknownOpts,
): void {
    const id = employeeIdFromEnvironment()
    if (id !== undefined) {
        throw new UserError(
            `Only directors run \`${commandPath(actionCommand)}\`: LLMCO_CURRENT_HUMAN_ID has you act as "${id}". Unset it to act as a director.`,
        )
    }
}

export async function currentHuman(): Promise<CurrentHuman> {
    const id = employeeIdFromEnvironment()
    if (id === undefined) {
        return { kind: "director" }
    }
    if (!(await hasEmployee(projectRoot, id))) {
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
                worker: getCurrentWorker(position, state, directorPositionId),
            }
        }),
    )
    return workers
        .filter(({ worker }) => isWorkedBy(human, worker))
        .map(({ position, temporarily }) => ({ position, temporarily }))
}
