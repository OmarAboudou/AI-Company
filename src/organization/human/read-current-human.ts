import { projectRoot } from "../../cli/project-root.ts"
import { UserError } from "../../user-error.ts"
import type { Employee } from "../employee/schema.ts"
import { hasEmployee, loadEmployee } from "../employee/storage.ts"
import { employeeIdFromEnvironment } from "./read-current-human-id.ts"

export type CurrentHuman =
    | { kind: "director" }
    | { kind: "employee"; employee: Extract<Employee, { kind: "human" }> }

export async function currentHuman(): Promise<CurrentHuman> {
    const id = employeeIdFromEnvironment()
    if (id === undefined) {
        return { kind: "director" }
    }
    if (!(await hasEmployee(projectRoot, id))) {
        throw new UserError(
            `LLMCO_CURRENT_HUMAN_ID names no employee: "${id}". Run \`llmco employee list\`, or unset it to act as a director.`,
        )
    }
    const employee = await loadEmployee(projectRoot, id)
    if (employee.kind !== "human") {
        throw new UserError(
            `LLMCO_CURRENT_HUMAN_ID names "${id}", an LLM employee: only a human employee can be at the keyboard. Unset it to act as a director.`,
        )
    }
    return { kind: "employee", employee }
}
