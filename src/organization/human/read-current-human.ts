import { UserError } from "../../user-error.ts"
import type { Employee } from "../employee/schema.ts"
import { hasEmployee, loadEmployee } from "../employee/storage.ts"
import { readCurrentHumanId } from "./read-current-human-id.ts"

export type CurrentHuman =
    | { kind: "director" }
    | { kind: "employee"; employee: Extract<Employee, { kind: "human" }> }

export async function readCurrentHuman(
    projectRoot: string,
    environment: NodeJS.ProcessEnv,
): Promise<CurrentHuman> {
    const id = readCurrentHumanId(environment)
    if (id === undefined) {
        return { kind: "director" }
    }
    if (!(await hasEmployee(projectRoot, id))) {
        throw new UserError(
            `AICO_CURRENT_HUMAN_ID names no employee: "${id}". Run \`aico employee list\`, or \`aico current-human clear\` to act as a director.`,
        )
    }
    const employee = await loadEmployee(projectRoot, id)
    if (employee.kind !== "human") {
        throw new UserError(
            `AICO_CURRENT_HUMAN_ID names "${id}", an LLM employee: only a human employee can be at the keyboard. Run \`aico current-human clear\` to act as a director.`,
        )
    }
    return { kind: "employee", employee }
}
