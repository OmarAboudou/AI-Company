import type { PositionAssignment } from "../position/schema.ts"
import { isWorkedByDirectors } from "./is-worked-by-directors.ts"

export function getPositionsWorkedByDirectors(
    assignments: PositionAssignment[],
): PositionAssignment[] {
    return assignments.filter(({ holder }) => isWorkedByDirectors(holder))
}
