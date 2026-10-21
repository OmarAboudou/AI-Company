import { z } from "zod"
import { UserError } from "./user-error.ts"

export function parseConfig<Config>(
    schema: z.ZodType<Config>,
    rawConfig: unknown,
): Config {
    const validation = schema.safeParse(rawConfig)
    if (!validation.success) {
        throw new UserError(z.prettifyError(validation.error))
    }
    return validation.data
}
