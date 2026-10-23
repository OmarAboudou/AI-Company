import { getDefinedValues } from "../../get-defined-values.ts"
import { parseConfig } from "../../parse-config.ts"
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
    const updatedConfig = parseConfig(EmployeeConfigSchema, {
        ...config,
        ...getDefinedValues(changes),
    })
    await requireEmployeeModel(projectRoot, updatedConfig)
    const updatedEmployee = {
        id,
        ...updatedConfig,
        createdAt,
        formerIds,
    }
    await saveEmployee(projectRoot, updatedEmployee)
    return updatedEmployee
}
