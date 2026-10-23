import { UserError } from "../../user-error.ts"
import type { Author, UnsentMessage } from "./schema.ts"

export function createUnsentMessage(
    author: Author,
    body: string,
): UnsentMessage {
    if (body.trim() === "") {
        throw new UserError("The message's body is empty.")
    }
    return { ...author, body }
}
