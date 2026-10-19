import { z } from "zod"
import { UserError } from "../user-error.ts"
import { IdSchema } from "./id-schema.ts"

export function parseId(entity: string, rawId: string): string {
    const validation = IdSchema.safeParse(rawId)
    if (!validation.success) {
        throw new UserError(
            `Invalid ${entity} id "${rawId}".\n${z.prettifyError(validation.error)}`,
        )
    }
    return validation.data
}
