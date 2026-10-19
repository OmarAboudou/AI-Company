import { relative } from "node:path"
import { z } from "zod"
import { UserError } from "../user-error.ts"
import { readText } from "./read-text-file.ts"

export async function readConfig<T>(
    projectRoot: string,
    path: string,
    schema: z.ZodType<T>,
): Promise<T> {
    const displayPath = relative(projectRoot, path)
    const json = parseJson(await readText(projectRoot, path), displayPath)
    const result = schema.safeParse(json)
    if (!result.success) {
        throw new UserError(
            `Invalid ${displayPath}:\n${z.prettifyError(result.error)}`,
        )
    }
    return result.data
}

function parseJson(text: string, displayPath: string): unknown {
    try {
        return JSON.parse(text)
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new UserError(
                `Invalid JSON in ${displayPath}: ${error.message}`,
            )
        }
        throw error
    }
}
