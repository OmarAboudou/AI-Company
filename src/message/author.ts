import { projectRoot } from "../cli-helpers.ts"
import { loadCompany } from "../company/storage.ts"
import { loadEmployee } from "../employee/storage.ts"
import { UserError } from "../errors.ts"
import { gitConfig } from "../git.ts"
import { loadPosition } from "../position/storage.ts"
import type { MessageConfig } from "./message.ts"

export type Author = Pick<MessageConfig, "position" | "employee" | "committer">

function committer(): MessageConfig["committer"] {
    const name = gitConfig(projectRoot, "user.name")
    const email = gitConfig(projectRoot, "user.email")
    if (name === undefined || email === undefined) {
        throw new UserError(
            "Messages record who typed them, as commits do: set `git config user.name` and `git config user.email`.",
        )
    }
    return { name, email }
}

export async function currentAuthor(): Promise<Author> {
    const { directorPositionId } = await loadCompany(projectRoot)
    const position = await loadPosition(projectRoot, directorPositionId)
    if (position.defaultEmployeeId === undefined) {
        throw new UserError(
            `The director's position "${position.id}" is vacant: you write from it, so assign yourself to it with \`llmco position assign ${position.id} <employee-id>\`.`,
        )
    }
    const employee = await loadEmployee(projectRoot, position.defaultEmployeeId)
    if (employee.kind !== "human") {
        throw new UserError(
            `The director's position "${position.id}" is held by "${employee.id}", an LLM: you write from it, so a human must hold it.`,
        )
    }
    return {
        position: { id: position.id, title: position.title },
        employee: { id: employee.id, name: employee.name },
        committer: committer(),
    }
}
