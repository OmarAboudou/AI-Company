import { projectRoot } from "../cli-helpers.ts"
import { loadCompany } from "../company/storage.ts"
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
    return {
        position: { id: position.id, title: position.title },
        committer: committer(),
    }
}
