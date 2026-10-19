import { slugify } from "./slugify.ts"
import { hasThread } from "./storage.ts"

export async function createThreadId(
    projectRoot: string,
    subject: string,
    createdAt: string,
): Promise<string> {
    const baseId = `${createdAt.slice(0, 10)}-${slugify(subject)}`
    let id = baseId
    for (let suffix = 2; await hasThread(projectRoot, id); suffix++) {
        id = `${baseId}-${suffix}`
    }
    return id
}
