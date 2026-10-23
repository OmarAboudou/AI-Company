import { IdSchema } from "../../ids/id-schema.ts"
import { UserError } from "../../user-error.ts"

export function readCurrentPositionId(
    environment: NodeJS.ProcessEnv,
): string | undefined {
    const rawId = environment.LLMCO_CURRENT_POSITION_ID
    if (rawId === undefined || rawId === "") {
        return undefined
    }
    if (!IdSchema.safeParse(rawId).success) {
        throw new UserError(
            `LLMCO_CURRENT_POSITION_ID is "${rawId}", which isn't a position id. Run \`aico current-position clear\`.`,
        )
    }
    return rawId
}
