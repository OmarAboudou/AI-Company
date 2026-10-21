import type { PositionAssignment, Worker } from "../position/schema.ts"
import type { CurrentHuman } from "./read-current-human.ts"

function isWorkedBy(human: CurrentHuman, worker: Worker | undefined): boolean {
    if (human.kind === "director") {
        return worker?.kind === "directors"
    }
    return (
        worker?.kind === "employee" && worker.employeeId === human.employee.id
    )
}

export function getPositionsWorkedBy(
    assignments: PositionAssignment[],
    human: CurrentHuman,
): PositionAssignment[] {
    return assignments.filter(({ currentWorker }) =>
        isWorkedBy(human, currentWorker),
    )
}
