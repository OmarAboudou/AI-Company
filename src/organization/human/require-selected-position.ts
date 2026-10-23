import { UserError } from "../../user-error.ts"
import type { Position } from "../position/schema.ts"

export function requireSelectedPosition(
    workedPositions: Position[],
    currentPositionId: string,
): Position {
    const position = workedPositions.find(({ id }) => id === currentPositionId)
    if (position === undefined) {
        throw new UserError(
            `The position selected in this shell, "${currentPositionId}", isn't one you hold now. Select another with \`aico current-position set <position-id>\`, or run \`aico current-position clear\`.`,
        )
    }
    return position
}
