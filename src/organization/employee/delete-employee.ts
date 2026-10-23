import { UserError } from "../../user-error.ts"
import { requireCompany } from "../company/require-company.ts"
import { listPositions, savePosition } from "../position/storage.ts"
import { getPositionsHeldBy } from "./get-positions-held-by.ts"
import { loadExistingEmployee } from "./load-existing-employee.ts"
import type { Employee } from "./schema.ts"
import { deleteEmployeeFolder } from "./storage.ts"

export type DeleteEmployeeResult = {
    employee: Employee
    releasedPositionIds: string[]
}

export async function deleteEmployee(
    projectRoot: string,
    rawId: string,
    { shouldForce = false }: { shouldForce?: boolean } = {},
): Promise<DeleteEmployeeResult> {
    await requireCompany(projectRoot)
    const [employee, positions] = await Promise.all([
        loadExistingEmployee(projectRoot, rawId),
        listPositions(projectRoot),
    ])
    const heldPositions = getPositionsHeldBy(positions, employee.id)
    const releasedPositionIds = heldPositions.map(({ id }) => id)
    if (releasedPositionIds.length > 0 && !shouldForce) {
        const positionList = releasedPositionIds.join(", ")
        throw new UserError(
            `Employee "${employee.id}" holds ${positionList}. Add --force to delete it anyway and give ${positionList} back to the user.`,
        )
    }
    await Promise.all(
        heldPositions.map(({ employeeId, ...position }) =>
            savePosition(projectRoot, position),
        ),
    )
    await deleteEmployeeFolder(projectRoot, employee.id)
    return { employee, releasedPositionIds }
}
