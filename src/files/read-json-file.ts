import { relative } from "node:path"
import { z } from "zod"
import { UserError } from "../user-error.ts"
import { readTextFile } from "./read-text-file.ts"

export async function readJsonFile<Content>(
    projectRoot: string,
    path: string,
    schema: z.ZodType<Content>,
): Promise<Content> {
    const displayPath = relative(projectRoot, path)
    const parsedJson = parseJson(
        await readTextFile(projectRoot, path),
        displayPath,
    )
    const validation = schema.safeParse(parsedJson)
    if (!validation.success) {
        throw new UserError(
            `Invalid ${displayPath}:\n${z.prettifyError(validation.error)}`,
        )
    }
    return validation.data
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
