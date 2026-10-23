import { watch } from "node:fs"
import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { getAicoFolderPath } from "../files/get-aico-folder-path.ts"
import { listJsonFileIds } from "../files/list-json-file-ids.ts"
import { readJsonFile } from "../files/read-json-file.ts"
import { saveNewJsonFile } from "../files/save-new-json-file.ts"
import {
    type Journal,
    type JournalEvent,
    JournalEventSchema,
} from "./schema.ts"

function getJournalFolderPath(projectRoot: string): string {
    return join(getAicoFolderPath(projectRoot), "journal")
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

export async function loadJournal(projectRoot: string): Promise<Journal> {
    return { projectRoot, events: await listEvents(projectRoot) }
}

export async function refreshJournal(
    journal: Journal,
): Promise<JournalEvent[]> {
    const { projectRoot, events } = journal
    const knownEventIds = new Set(events.map(({ id }) => id))
    const eventIds = await listJsonFileIds(getJournalFolderPath(projectRoot))
    const newEvents = await Promise.all(
        eventIds
            .filter((id) => !knownEventIds.has(id))
            .map((id) => loadEvent(projectRoot, id)),
    )
    events.push(...newEvents)
    events.sort(({ id }, { id: otherId }) => (id < otherId ? -1 : 1))
    return newEvents
}

export type JournalWatch = {
    forgetChanges(): void
    waitForChange(): Promise<void>
    stop(): void
}

export async function watchJournal(projectRoot: string): Promise<JournalWatch> {
    const folderPath = getJournalFolderPath(projectRoot)
    await mkdir(folderPath, { recursive: true })
    let hasChanged = false
    let onChange = () => {}
    const watcher = watch(folderPath, () => {
        hasChanged = true
        onChange()
    })
    return {
        forgetChanges: () => {
            hasChanged = false
        },
        waitForChange: () =>
            hasChanged
                ? Promise.resolve()
                : new Promise((resolve) => {
                      onChange = resolve
                  }),
        stop: () => watcher.close(),
    }
}
