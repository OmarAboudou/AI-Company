import { join } from "node:path"
import { getLlmcoFolderPath } from "../../files/get-llmco-folder-path.ts"
import { listSubdirectories } from "../../files/list-subdirectories.ts"
import { readJsonFile } from "../../files/read-json-file.ts"
import { type Thread, ThreadConfigSchema } from "./schema.ts"

function getThreadsFolderPath(projectRoot: string): string {
    return join(getLlmcoFolderPath(projectRoot), "threads")
}

export function getThreadFolderPath(projectRoot: string, id: string): string {
    return join(getThreadsFolderPath(projectRoot), id)
}

function getThreadConfigPath(projectRoot: string, id: string): string {
    return join(getThreadFolderPath(projectRoot, id), "thread.json")
}

export async function hasThread(
    projectRoot: string,
    id: string,
): Promise<boolean> {
    return Bun.file(getThreadConfigPath(projectRoot, id)).exists()
}

export async function loadThread(
    projectRoot: string,
    id: string,
): Promise<Thread> {
    const config = await readJsonFile(
        projectRoot,
        getThreadConfigPath(projectRoot, id),
        ThreadConfigSchema,
    )
    return { id, ...config }
}

export async function listThreads(projectRoot: string): Promise<Thread[]> {
    const threadIds = await listSubdirectories(
        getThreadsFolderPath(projectRoot),
    )
    return Promise.all(threadIds.map((id) => loadThread(projectRoot, id)))
}

export async function saveThread(
    projectRoot: string,
    thread: Thread,
): Promise<void> {
    const { id, ...config } = thread
    await Bun.write(
        getThreadConfigPath(projectRoot, id),
        `${JSON.stringify(config, null, 4)}\n`,
    )
}
