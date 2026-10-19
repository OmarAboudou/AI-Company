import { UserError } from "../../user-error.ts"
import { findMentions } from "./find-mentions.ts"
import { resolveMentions } from "./resolve-mentions.ts"
import type { Author, Draft } from "./schema.ts"

export async function createDraft(
    projectRoot: string,
    author: Author,
    body: string,
): Promise<Draft> {
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
