import { parseId } from "../../ids/parse-id.ts"
import { UserError } from "../../user-error.ts"
import type { Employee } from "./schema.ts"
import { hasEmployee, loadEmployee } from "./storage.ts"

export async function loadExistingEmployee(
    projectRoot: string,
    rawId: string,
): Promise<Employee> {
    const id = parseId("employee", rawId)
    if (!(await hasEmployee(projectRoot, id))) {
        throw new UserError(`No employee "${id}". Run \`aico employee list\`.`)
    }
    return loadEmployee(projectRoot, id)
}
