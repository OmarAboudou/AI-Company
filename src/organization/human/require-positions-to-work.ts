import { UserError } from "../../user-error.ts"
import type { Position } from "../position/schema.ts"
import type { CurrentHuman } from "./read-current-human.ts"
import { requireSelectedPosition } from "./require-selected-position.ts"

export function requirePositionsToWork(
    human: CurrentHuman,
    workedPositions: Position[],
    currentPositionId: string | undefined,
): Position[] {
    if (currentPositionId !== undefined) {
        return [requireSelectedPosition(workedPositions, currentPositionId)]
    }
    if (workedPositions.length === 0 && human.kind === "employee") {
        const { id, name } = human.employee
        throw new UserError(
            `${name} (${id}) works no position, so no task waits for them. A director can assign one temporarily: \`llmco position assign-temporarily employee <position-id> ${id}\`.`,
        )
    }
    return workedPositions
}
