import { z } from "zod"
import { getDefinedValues } from "../../get-defined-values.ts"
import { UserError } from "../../user-error.ts"
import { requireCompany } from "../company/require-company.ts"
import { loadExistingEmployee } from "./load-existing-employee.ts"
import { requireEmployeeModel } from "./require-employee-model.ts"
import { type Employee, EmployeeConfigSchema } from "./schema.ts"
import { saveEmployee } from "./storage.ts"

export async function updateEmployee(
    projectRoot: string,
    rawId: string,
    changes: { name?: string; providerId?: string; modelId?: string },
): Promise<Employee> {
    await requireCompany(projectRoot)
    const { id, createdAt, formerIds, ...config } = await loadExistingEmployee(
        projectRoot,
        rawId,
    )
    const hasModelChanges = [changes.providerId, changes.modelId].some(
        (change) => change !== undefined,
    )
    if (config.kind === "human" && hasModelChanges) {
        throw new UserError(
            `Employee "${id}" is a human: it has no provider or model.`,
        )
    }
    const validation = EmployeeConfigSchema.safeParse({
        ...config,
        ...getDefinedValues(changes),
    })
    if (!validation.success) {
        throw new UserError(z.prettifyError(validation.error))
    }
    await requireEmployeeModel(projectRoot, validation.data)
    const updatedEmployee = {
        id,
        ...validation.data,
        createdAt,
        formerIds,
    }
    await saveEmployee(projectRoot, updatedEmployee)
    return updatedEmployee
}
