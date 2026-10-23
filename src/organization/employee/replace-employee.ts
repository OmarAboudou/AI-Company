import { UserError } from "../../user-error.ts"
import { requireCompany } from "../company/require-company.ts"
import { listPositions, savePosition } from "../position/storage.ts"
import { getPositionsHeldBy } from "./get-positions-held-by.ts"
import { loadExistingEmployee } from "./load-existing-employee.ts"

export type ReplaceEmployeeResult = {
    employeeId: string
    replacementId: string
    heldPositionIds: string[]
}

export async function replaceEmployee(
    projectRoot: string,
    rawId: string,
    rawReplacementId: string,
): Promise<ReplaceEmployeeResult> {
    await requireCompany(projectRoot)
    const [employee, replacement, positions] = await Promise.all([
        loadExistingEmployee(projectRoot, rawId),
        loadExistingEmployee(projectRoot, rawReplacementId),
        listPositions(projectRoot),
    ])
    if (replacement.id === employee.id) {
        throw new UserError(`"${employee.id}" can't replace itself.`)
    }
    const heldPositions = getPositionsHeldBy(positions, employee.id)
    await Promise.all(
        heldPositions.map((position) =>
            savePosition(projectRoot, {
                ...position,
                employeeId: replacement.id,
            }),
        ),
    )
    return {
        employeeId: employee.id,
        replacementId: replacement.id,
        heldPositionIds: heldPositions.map(({ id }) => id),
    }
}
