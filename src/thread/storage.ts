import { join } from "node:path"
import { listSubdirectories, readConfig } from "../files.ts"
import { llmcoDir } from "../project.ts"
import { type Thread, ThreadConfigSchema } from "./thread.ts"

const maxSlugLength = 50

function threadsDir(projectRoot: string): string {
    return join(llmcoDir(projectRoot), "threads")
}

export function threadDir(projectRoot: string, id: string): string {
    return join(threadsDir(projectRoot), id)
}

function threadConfigPath(projectRoot: string, id: string): string {
    return join(threadDir(projectRoot, id), "thread.json")
}

export async function threadExists(
    projectRoot: string,
    id: string,
): Promise<boolean> {
    return Bun.file(threadConfigPath(projectRoot, id)).exists()
}

export async function loadThread(
    projectRoot: string,
    id: string,
): Promise<Thread> {
    const config = await readConfig(
        projectRoot,
        threadConfigPath(projectRoot, id),
        ThreadConfigSchema,
    )
    return { id, ...config }
}

export async function listThreads(projectRoot: string): Promise<Thread[]> {
    const ids = await listSubdirectories(threadsDir(projectRoot))
    return Promise.all(ids.map((id) => loadThread(projectRoot, id)))
}

export async function saveThread(
    projectRoot: string,
    thread: Thread,
): Promise<void> {
    const { id, ...config } = thread
    await Bun.write(
        threadConfigPath(projectRoot, id),
        `${JSON.stringify(config, null, 4)}\n`,
    )
}

export function slugify(subject: string): string {
    const words = subject
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word !== "")
    let slug = ""
    for (const word of words) {
        const longer = slug === "" ? word : `${slug}-${word}`
        if (longer.length > maxSlugLength) {
            break
        }
        slug = longer
    }
    return slug === "" ? "thread" : slug
}

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
