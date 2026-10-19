import { readTextOrFile } from "./read-text-or-file.ts"

export async function readBody(options: {
    body?: string
    bodyFile?: string
}): Promise<string | undefined> {
    return readTextOrFile(options.body, options.bodyFile)
}
