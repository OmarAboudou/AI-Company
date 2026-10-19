import { join } from "node:path"
import { getLlmcoFolderPath } from "../../files/get-llmco-folder-path.ts"
import { listSubdirectories } from "../../files/list-subdirectories.ts"
import { readJsonFile } from "../../files/read-json-file.ts"
import { type Thread, ThreadConfigSchema } from "./schema.ts"

function threadsDir(projectRoot: string): string {
    return join(getLlmcoFolderPath(projectRoot), "threads")
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
    const config = await readJsonFile(
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
