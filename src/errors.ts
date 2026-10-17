/** A problem the user can fix (bad argument, missing or invalid file): the CLI shows only its message. */
export class UserError extends Error {
    override name = "UserError"
}
