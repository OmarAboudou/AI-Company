import type { Position } from "../position/schema.ts"
import { requireSelectedPosition } from "./require-selected-position.ts"

export function requirePositionsToWork(
    workedPositions: Position[],
    currentPositionId: string | undefined,
): Position[] {
    return currentPositionId === undefined
        ? workedPositions
        : [requireSelectedPosition(workedPositions, currentPositionId)]
}
