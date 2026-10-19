import { z } from "zod"
import { UserError } from "../user-error.ts"
import { IdSchema } from "./id-schema.ts"

export function parseId(entityKind: string, rawId: string): string {
    const validation = IdSchema.safeParse(rawId)
    if (!validation.success) {
        throw new UserError(
            `Invalid ${entityKind} id "${rawId}".\n${z.prettifyError(validation.error)}`,
        )
    }
    return validation.data
}
