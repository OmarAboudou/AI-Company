import { UserError } from "../../user-error.ts"
import { requireCompany } from "../company/require-company.ts"
import { loadExistingEmployee } from "../employee/load-existing-employee.ts"
import type { CurrentHuman } from "./read-current-human.ts"

export async function setCurrentHuman(
    projectRoot: string,
    rawEmployeeId: string,
): Promise<CurrentHuman> {
    await requireCompany(projectRoot)
    const employee = await loadExistingEmployee(projectRoot, rawEmployeeId)
    if (employee.kind !== "human") {
        throw new UserError(
            `"${employee.id}" is an LLM employee: only a human employee can be at the keyboard.`,
        )
    }
    return { kind: "employee", employee }
}
