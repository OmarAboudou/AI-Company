import type { PositionAssignment } from "../position/schema.ts"
import { isWorkedBy } from "./is-worked-by.ts"
import type { CurrentHuman } from "./read-current-human.ts"

export function getPositionsWorkedBy(
    assignments: PositionAssignment[],
    human: CurrentHuman,
): PositionAssignment[] {
    return assignments.filter(({ currentWorker }) =>
        isWorkedBy(human, currentWorker),
    )
}
