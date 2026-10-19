import { parseId } from "../ids/parse-id.ts"
import { UserError } from "../user-error.ts"
import type { Employee } from "./employee.ts"
import { employeeExists, loadEmployee } from "./storage.ts"

export async function loadExistingEmployee(
    projectRoot: string,
    rawId: string,
): Promise<Employee> {
    const id = parseId("employee", rawId)
    if (!(await employeeExists(projectRoot, id))) {
        throw new UserError(`No employee "${id}". Run \`llmco employee list\`.`)
    }
    return loadEmployee(projectRoot, id)
}
