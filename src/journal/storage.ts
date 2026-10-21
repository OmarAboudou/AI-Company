import { join } from "node:path"
import { getLlmcoFolderPath } from "../files/get-llmco-folder-path.ts"
import { listJsonFileIds } from "../files/list-json-file-ids.ts"
import { readJsonFile } from "../files/read-json-file.ts"
import { saveNewJsonFile } from "../files/save-new-json-file.ts"
import { type JournalEvent, JournalEventSchema } from "./schema.ts"

function getJournalFolderPath(projectRoot: string): string {
    return join(getLlmcoFolderPath(projectRoot), "journal")
}

function getEventFilePath(projectRoot: string, id: string): string {
    return join(getJournalFolderPath(projectRoot), `${id}.json`)
}

export async function loadEvent(
    projectRoot: string,
    id: string,
): Promise<JournalEvent> {
    const content = await readJsonFile(
        projectRoot,
        getEventFilePath(projectRoot, id),
        JournalEventSchema,
    )
    return { id, ...content }
}

export async function listEvents(projectRoot: string): Promise<JournalEvent[]> {
    const eventIds = await listJsonFileIds(getJournalFolderPath(projectRoot))
    return Promise.all(eventIds.map((id) => loadEvent(projectRoot, id)))
}

export async function saveEvent(
    projectRoot: string,
    event: JournalEvent,
): Promise<void> {
    const { id, ...content } = event
    await saveNewJsonFile(getEventFilePath(projectRoot, id), content)
}
