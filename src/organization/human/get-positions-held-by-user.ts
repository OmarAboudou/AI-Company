import type { PositionAssignment } from "../position/schema.ts"
import { isHeldByUser } from "./is-held-by-user.ts"

export function getPositionsHeldByUser(
    assignments: PositionAssignment[],
): PositionAssignment[] {
    return assignments.filter(({ holder }) => isHeldByUser(holder))
}
