import { requireCompany } from "../../company/require-company.ts"
import { loadCompany } from "../../company/storage.ts"
import { parseId } from "../../ids/parse-id.ts"
import { UserError } from "../../user-error.ts"
import { loadExistingEmployee } from "../employee/load-existing-employee.ts"
import { loadExistingPosition } from "./load-existing-position.ts"
import type { Worker } from "./schema.ts"
import {
    loadPositionState,
    savePosition,
    savePositionState,
} from "./storage.ts"

export type PositionAssignment = {
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
): Promise<PositionAssignment> {
    await requireCompany(projectRoot)
    const [position, employee, company, state] = await Promise.all([
        loadExistingPosition(projectRoot, rawPositionId),
        loadExistingEmployee(projectRoot, rawEmployeeId),
        loadCompany(projectRoot),
        loadPositionState(projectRoot, parseId("position", rawPositionId)),
    ])
    if (position.id === company.directorPositionId) {
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
