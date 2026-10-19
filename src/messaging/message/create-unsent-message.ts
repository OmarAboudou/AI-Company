import { UserError } from "../../user-error.ts"
import { findMentions } from "./find-mentions.ts"
import { resolveMentions } from "./resolve-mentions.ts"
import type { Author, UnsentMessage } from "./schema.ts"

export async function createUnsentMessage(
    projectRoot: string,
    author: Author,
    body: string,
): Promise<UnsentMessage> {
    if (body.trim() === "") {
        throw new UserError("The message's body is empty.")
    }
    const { employeeMentions } = findMentions(body)
    if (employeeMentions.length > 0) {
        throw new UserError(
            `Mentioning a specific employee (${employeeMentions.join(", ")}) isn't possible yet: mention the position.`,
        )
    }
    return {
        ...author,
        body,
        ...(await resolveMentions(projectRoot, body, author.position.id)),
    }
}
