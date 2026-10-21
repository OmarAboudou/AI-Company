import type { PositionAssignment } from "../position/schema.ts"

export function getPositionsWorkedTemporarilyBy(
    assignments: PositionAssignment[],
    employeeId: string,
): PositionAssignment[] {
    return assignments.filter(
        ({ state: { temporaryAssignment: worker } }) =>
            worker?.kind === "employee" && worker.employeeId === employeeId,
    )
}
