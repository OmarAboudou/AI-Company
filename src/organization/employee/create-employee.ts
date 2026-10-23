import { parseId } from "../../ids/parse-id.ts"
import { parseConfig } from "../../parse-config.ts"
import { UserError } from "../../user-error.ts"
import { requireCompany } from "../company/require-company.ts"
import { requireEmployeeModel } from "./require-employee-model.ts"
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
    rawConfig: EmployeeConfig,
    { shouldReuseId = false }: { shouldReuseId?: boolean } = {},
): Promise<Employee> {
    await requireCompany(projectRoot)
    const id = parseId("employee", rawId)
    const config = parseConfig(EmployeeConfigSchema, rawConfig)
    const [isTaken] = await Promise.all([
        hasEmployee(projectRoot, id),
        requireEmployeeModel(projectRoot, config),
    ])
    if (isTaken) {
        throw new UserError(`Employee "${id}" already exists.`)
    }
    await requireUnusedEmployeeId(projectRoot, id, { shouldReuseId })
    const employee = {
        id,
        ...config,
        createdAt: new Date().toISOString(),
    }
    await saveEmployee(projectRoot, employee)
    return employee
}
