import type { Worker } from "../position/schema.ts"
import type { CurrentHuman } from "./read-current-human.ts"

export function isWorkedBy(
    human: CurrentHuman,
    worker: Worker | undefined,
): boolean {
    if (human.kind === "director") {
        return worker?.kind === "directors"
    }
    return (
        worker?.kind === "employee" && worker.employeeId === human.employee.id
    )
}
