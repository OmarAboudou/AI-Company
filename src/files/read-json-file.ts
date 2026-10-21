import { relative } from "node:path"
import type { z } from "zod"
import { parseJsonText } from "./parse-json-text.ts"
import { readTextFile } from "./read-text-file.ts"

export async function readJsonFile<Content>(
    projectRoot: string,
    path: string,
    schema: z.ZodType<Content>,
): Promise<Content> {
    const text = await readTextFile(projectRoot, path)
    return parseJsonText(text, schema, relative(projectRoot, path))
}
