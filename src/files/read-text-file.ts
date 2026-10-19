import { relative } from "node:path"
import { UserError } from "../user-error.ts"

export async function readText(
    projectRoot: string,
    path: string,
): Promise<string> {
    const file = Bun.file(path)
    if (!(await file.exists())) {
        throw new UserError(`Missing file: ${relative(projectRoot, path)}`)
    }
    return file.text()
}
