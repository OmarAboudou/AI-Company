import { join } from "node:path"
import { getStateFolderPath } from "../../files/get-state-folder-path.ts"
import { readJsonFile } from "../../files/read-json-file.ts"
import { saveState } from "../../files/save-state.ts"
import { DispatchedEventsSchema } from "./schema.ts"

function getDispatchedEventsFilePath(projectRoot: string): string {
    return join(getStateFolderPath(projectRoot), "dispatched-events.json")
}

export async function loadDispatchedEventIds(
    projectRoot: string,
): Promise<Set<string>> {
    const path = getDispatchedEventsFilePath(projectRoot)
    if (!(await Bun.file(path).exists())) {
        return new Set()
    }
    const { eventIds } = await readJsonFile(
        projectRoot,
        path,
        DispatchedEventsSchema,
    )
    return new Set(eventIds)
}

export async function saveDispatchedEventIds(
    projectRoot: string,
    eventIds: ReadonlySet<string>,
): Promise<void> {
    await saveState(projectRoot, getDispatchedEventsFilePath(projectRoot), {
        eventIds: [...eventIds].sort(),
    })
}
