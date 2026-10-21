import { UserError } from "../../user-error.ts"
import { requireCompany } from "../company/require-company.ts"
import { loadExistingEmployee } from "../employee/load-existing-employee.ts"
import { loadExistingPositionAssignment } from "./load-existing-position-assignment.ts"
import type { Worker } from "./schema.ts"
import { savePosition, savePositionState } from "./storage.ts"

export type AssignPositionResult = {
    positionId: string
    employeeId: string
    previousEmployeeId: string | undefined
    hasEndedTemporaryAssignment: boolean
    temporaryAssignment: Worker | undefined
}

export async function assignPosition(
    projectRoot: string,
    rawPositionId: string,
    rawEmployeeId: string,
    { shouldReplace = false }: { shouldReplace?: boolean } = {},
): Promise<AssignPositionResult> {
    await requireCompany(projectRoot)
    const [{ position, isDirectorPosition, state }, employee] =
        await Promise.all([
            loadExistingPositionAssignment(projectRoot, rawPositionId),
            loadExistingEmployee(projectRoot, rawEmployeeId),
        ])
    if (isDirectorPosition) {
        throw new UserError(
            `Position "${position.id}" is the director's position: the people working on this repository hold it, identified by git, not an employee.`,
        )
    }
    const previousEmployeeId = position.defaultEmployeeId
    const { temporaryAssignment, ...otherState } = state
    if (previousEmployeeId === employee.id) {
        return {
            positionId: position.id,
            employeeId: employee.id,
            previousEmployeeId,
            hasEndedTemporaryAssignment: false,
            temporaryAssignment,
        }
    }
    if (previousEmployeeId !== undefined && !shouldReplace) {
        throw new UserError(
            `Position "${position.id}" already has "${previousEmployeeId}" as default employee. Add --replace to replace it.`,
        )
    }
    const isTemporaryAssignee =
        temporaryAssignment?.kind === "employee" &&
        temporaryAssignment.employeeId === employee.id
    await Promise.all([
        savePosition(projectRoot, {
            ...position,
            defaultEmployeeId: employee.id,
        }),
        isTemporaryAssignee
            ? savePositionState(projectRoot, position.id, otherState)
            : undefined,
    ])
    return {
        positionId: position.id,
        employeeId: employee.id,
        previousEmployeeId,
        hasEndedTemporaryAssignment: isTemporaryAssignee,
        temporaryAssignment: isTemporaryAssignee
            ? undefined
            : temporaryAssignment,
    }
}
