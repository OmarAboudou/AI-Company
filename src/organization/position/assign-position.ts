import { UserError } from "../../user-error.ts"
import { requireCompany } from "../company/require-company.ts"
import { loadExistingEmployee } from "../employee/load-existing-employee.ts"
import { loadExistingPositionAssignment } from "./load-existing-position-assignment.ts"
import { savePosition } from "./storage.ts"

export type AssignPositionResult = {
    positionId: string
    employeeId: string
    previousEmployeeId: string | undefined
}

export async function assignPosition(
    projectRoot: string,
    rawPositionId: string,
    rawEmployeeId: string,
    { shouldReplace = false }: { shouldReplace?: boolean } = {},
): Promise<AssignPositionResult> {
    await requireCompany(projectRoot)
    const [{ position, isFounderPosition }, employee] = await Promise.all([
        loadExistingPositionAssignment(projectRoot, rawPositionId),
        loadExistingEmployee(projectRoot, rawEmployeeId),
    ])
    if (isFounderPosition) {
        throw new UserError(
            `Position "${position.id}" is the founder's position: you always hold it, never an employee.`,
        )
    }
    const previousEmployeeId = position.employeeId
    const assignment = {
        positionId: position.id,
        employeeId: employee.id,
        previousEmployeeId,
    }
    if (previousEmployeeId === employee.id) {
        return assignment
    }
    if (previousEmployeeId !== undefined && !shouldReplace) {
        throw new UserError(
            `"${previousEmployeeId}" already holds position "${position.id}". Add --replace to replace it.`,
        )
    }
    await savePosition(projectRoot, { ...position, employeeId: employee.id })
    return assignment
}
