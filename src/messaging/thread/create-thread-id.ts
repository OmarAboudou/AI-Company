import { slugify } from "./slugify.ts"
import { threadExists } from "./storage.ts"

export async function newThreadId(
    projectRoot: string,
    subject: string,
    createdAt: string,
): Promise<string> {
    const base = `${createdAt.slice(0, 10)}-${slugify(subject)}`
    let id = base
    for (let suffix = 2; await threadExists(projectRoot, id); suffix++) {
        id = `${base}-${suffix}`
    }
    return id
}
