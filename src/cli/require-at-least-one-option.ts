import { UserError } from "../user-error.ts"

export function requireAnOption(options: object): void {
    if (Object.values(options).every((value) => value === undefined)) {
        throw new UserError(
            "Nothing to update: give at least one option (see --help).",
        )
    }
}
