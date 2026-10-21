import { UserError } from "../../user-error.ts"
import { requireCompany } from "../company/require-company.ts"
import { listPositionAssignments } from "../position/list-position-assignments.ts"
import { savePosition, savePositionState } from "../position/storage.ts"
import { getPositionsFilledBy } from "./get-positions-filled-by.ts"
import { getPositionsWorkedTemporarilyBy } from "./get-positions-worked-temporarily-by.ts"
import { loadExistingEmployee } from "./load-existing-employee.ts"
import type { Employee } from "./schema.ts"
import { deleteEmployeeFolder } from "./storage.ts"

export type DeleteEmployeeResult = {
    employee: Employee
    vacatedPositionIds: string[]
    endedTemporaryPositionIds: string[]
}

export async function deleteEmployee(
    projectRoot: string,
    rawId: string,
    { shouldForce = false }: { shouldForce?: boolean } = {},
): Promise<DeleteEmployeeResult> {
    await requireCompany(projectRoot)
    const [employee, assignments] = await Promise.all([
        loadExistingEmployee(projectRoot, rawId),
        listPositionAssignments(projectRoot),
    ])
    const positions = assignments.map(({ position }) => position)
    const filledPositions = getPositionsFilledBy(positions, employee.id)
    const temporaryPositions = getPositionsWorkedTemporarilyBy(
        assignments,
        employee.id,
    )
    const vacatedPositionIds = filledPositions.map(({ id }) => id)
    const endedTemporaryPositionIds = temporaryPositions.map(
        ({ position }) => position.id,
    )
    const reasonMessages: string[] = []
    const effectMessages: string[] = []
    if (vacatedPositionIds.length > 0) {
        reasonMessages.push(
            `is the default employee of ${vacatedPositionIds.join(", ")}`,
        )
        effectMessages.push(`leave ${vacatedPositionIds.join(", ")} vacant`)
    }
    if (endedTemporaryPositionIds.length > 0) {
        reasonMessages.push(
            `is assigned temporarily to ${endedTemporaryPositionIds.join(", ")}`,
        )
        effectMessages.push("end these temporary assignments")
    }
    if (reasonMessages.length > 0 && !shouldForce) {
        const actionMessages = ["delete it anyway", ...effectMessages]
        throw new UserError(
            `Employee "${employee.id}" ${reasonMessages.join(" and ")}. Add --force to ${actionMessages.slice(0, -1).join(", ")} and ${actionMessages.at(-1)}.`,
        )
    }
    await Promise.all([
        ...filledPositions.map(({ defaultEmployeeId, ...position }) =>
            savePosition(projectRoot, position),
        ),
        ...temporaryPositions.map(
            ({ position, state: { temporaryAssignment, ...state } }) =>
                savePositionState(projectRoot, position.id, state),
        ),
    ])
    await deleteEmployeeFolder(projectRoot, employee.id)
    return { employee, vacatedPositionIds, endedTemporaryPositionIds }
}
