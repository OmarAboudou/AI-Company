import { requireCompany } from "../../company/require-company.ts"
import { getRenamedEntity } from "../../ids/get-renamed-entity.ts"
import { parseId } from "../../ids/parse-id.ts"
import { UserError } from "../../user-error.ts"
import {
    listPositions,
    savePosition,
    savePositionState,
} from "../position/storage.ts"
import { getPositionsFilledBy } from "./get-positions-filled-by.ts"
import { listPositionsWorkedTemporarilyBy } from "./list-positions-worked-temporarily-by.ts"
import { loadExistingEmployee } from "./load-existing-employee.ts"
import { requireUnusedEmployeeId } from "./require-unused-employee-id.ts"
import type { Employee } from "./schema.ts"
import {
    copyEmployeeFolder,
    deleteEmployeeFolder,
    hasEmployee,
    saveEmployee,
} from "./storage.ts"

export type UpdateEmployeeIdResult = {
    employee: Employee
    renamedEmployee: Employee
    filledPositionIds: string[]
    temporarilyWorkedPositionIds: string[]
}

export async function updateEmployeeId(
    projectRoot: string,
    rawId: string,
    rawNewId: string,
    { shouldReuseId = false }: { shouldReuseId?: boolean } = {},
): Promise<UpdateEmployeeIdResult> {
    await requireCompany(projectRoot)
    const newId = parseId("employee", rawNewId)
    const [employee, isTaken, positions] = await Promise.all([
        loadExistingEmployee(projectRoot, rawId),
        hasEmployee(projectRoot, newId),
        listPositions(projectRoot),
    ])
    if (isTaken) {
        throw new UserError(`Employee "${newId}" already exists.`)
    }
    const [, temporaryPositions] = await Promise.all([
        requireUnusedEmployeeId(projectRoot, newId, {
            shouldReuseId,
            renamedEmployee: employee,
        }),
        listPositionsWorkedTemporarilyBy(projectRoot, positions, employee.id),
    ])
    const filledPositions = getPositionsFilledBy(positions, employee.id)
    const renamedEmployee = getRenamedEntity(
        employee,
        newId,
        new Date().toISOString(),
    )
    // Copy, repoint, then delete rather than move, so that an
    // interrupted command never leaves a position naming a missing
    // employee: at worst, the employee exists twice.
    await copyEmployeeFolder(projectRoot, employee.id, newId)
    await saveEmployee(projectRoot, renamedEmployee)
    await Promise.all([
        ...filledPositions.map((position) =>
            savePosition(projectRoot, {
                ...position,
                defaultEmployeeId: newId,
            }),
        ),
        ...temporaryPositions.map(({ position, state }) =>
            savePositionState(projectRoot, position.id, {
                ...state,
                temporaryAssignment: { kind: "employee", employeeId: newId },
            }),
        ),
    ])
    await deleteEmployeeFolder(projectRoot, employee.id)
    return {
        employee,
        renamedEmployee,
        filledPositionIds: filledPositions.map(({ id }) => id),
        temporarilyWorkedPositionIds: temporaryPositions.map(
            ({ position }) => position.id,
        ),
    }
}
