import { IdSchema } from "../../ids/id-schema.ts"
import { UserError } from "../../user-error.ts"

export function readCurrentHumanId(): string | undefined {
    const rawId = process.env.LLMCO_CURRENT_HUMAN_ID
    if (rawId === undefined || rawId === "") {
        return undefined
    }
    if (!IdSchema.safeParse(rawId).success) {
        throw new UserError(
            `LLMCO_CURRENT_HUMAN_ID is "${rawId}", which isn't an employee id. Run \`llmco current-human clear\` to act as a director.`,
        )
    }
    return rawId
}
