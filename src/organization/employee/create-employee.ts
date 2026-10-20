import { z } from "zod"
import { parseId } from "../../ids/parse-id.ts"
import { UserError } from "../../user-error.ts"
import { requireCompany } from "../company/require-company.ts"
import { requireEmployeeModel } from "./require-employee-model.ts"
import { requireUnreservedEmployeeId } from "./require-unreserved-employee-id.ts"
import { requireUnusedEmployeeId } from "./require-unused-employee-id.ts"
import {
    type Employee,
    type EmployeeConfig,
    EmployeeConfigSchema,
} from "./schema.ts"
import { hasEmployee, saveEmployee } from "./storage.ts"

export async function createEmployee(
    projectRoot: string,
    rawId: string,
    config: EmployeeConfig,
    { shouldReuseId = false }: { shouldReuseId?: boolean } = {},
): Promise<Employee> {
    await requireCompany(projectRoot)
    const id = parseId("employee", rawId)
    requireUnreservedEmployeeId(id)
    const validation = EmployeeConfigSchema.safeParse(config)
    if (!validation.success) {
        throw new UserError(z.prettifyError(validation.error))
    }
    const [isTaken] = await Promise.all([
        hasEmployee(projectRoot, id),
        requireEmployeeModel(projectRoot, validation.data),
    ])
    if (isTaken) {
        throw new UserError(`Employee "${id}" already exists.`)
    }
    await requireUnusedEmployeeId(projectRoot, id, { shouldReuseId })
    const employee = {
        id,
        ...validation.data,
        createdAt: new Date().toISOString(),
    }
    await saveEmployee(projectRoot, employee)
    return employee
}
