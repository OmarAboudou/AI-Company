import { join } from "node:path"
import { getAicoFolderPath } from "../../files/get-aico-folder-path.ts"
import { listJsonFileIds } from "../../files/list-json-file-ids.ts"
import { readJsonFile } from "../../files/read-json-file.ts"
import { saveNewJsonFile } from "../../files/save-new-json-file.ts"
import { type Task, TaskSchema } from "./schema.ts"

function getTasksFolderPath(projectRoot: string): string {
    return join(getAicoFolderPath(projectRoot), "tasks")
}

function getTaskFilePath(projectRoot: string, id: string): string {
    return join(getTasksFolderPath(projectRoot), `${id}.json`)
}

async function loadTask(projectRoot: string, id: string): Promise<Task> {
    const definition = await readJsonFile(
        projectRoot,
        getTaskFilePath(projectRoot, id),
        TaskSchema,
    )
    return { id, ...definition }
}

export async function listTasks(projectRoot: string): Promise<Task[]> {
    const taskIds = await listJsonFileIds(getTasksFolderPath(projectRoot))
    return Promise.all(taskIds.map((id) => loadTask(projectRoot, id)))
}

export async function saveTask(projectRoot: string, task: Task): Promise<void> {
    const { id, ...definition } = task
    await saveNewJsonFile(getTaskFilePath(projectRoot, id), definition)
}
