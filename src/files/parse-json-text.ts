import { z } from "zod"
import { UserError } from "../user-error.ts"

function parseJson(text: string, location: string): unknown {
    try {
        return JSON.parse(text)
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new UserError(`Invalid JSON in ${location}: ${error.message}`)
        }
        throw error
    }
}

export function parseJsonText<Content>(
    text: string,
    schema: z.ZodType<Content>,
    location: string,
): Content {
    const validation = schema.safeParse(parseJson(text, location))
    if (!validation.success) {
        throw new UserError(
            `Invalid ${location}:\n${z.prettifyError(validation.error)}`,
        )
    }
    return validation.data
}
