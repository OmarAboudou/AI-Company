import { getRenamedEntity } from "../../ids/get-renamed-entity.ts"
import { parseId } from "../../ids/parse-id.ts"
import { UserError } from "../../user-error.ts"
import { requireCompany } from "../company/require-company.ts"
import { listPositions, savePosition } from "../position/storage.ts"
import { getPositionsHeldBy } from "./get-positions-held-by.ts"
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
    heldPositionIds: string[]
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
    await requireUnusedEmployeeId(projectRoot, newId, {
        shouldReuseId,
        renamedEmployee: employee,
    })
    const heldPositions = getPositionsHeldBy(positions, employee.id)
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
    await Promise.all(
        heldPositions.map((position) =>
            savePosition(projectRoot, { ...position, employeeId: newId }),
        ),
    )
    await deleteEmployeeFolder(projectRoot, employee.id)
    return {
        employee,
        renamedEmployee,
        heldPositionIds: heldPositions.map(({ id }) => id),
    }
}
