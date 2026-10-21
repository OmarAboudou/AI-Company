import { readJsonFile } from "../files/read-json-file.ts"
import { saveJsonFile } from "../files/save-json-file.ts"
import { type IdHistoryRecord, IdHistorySchema } from "./id-history-schema.ts"

export async function loadIdHistory(
    projectRoot: string,
    path: string,
): Promise<IdHistoryRecord> {
    if (!(await Bun.file(path).exists())) {
        return {}
    }
    return readJsonFile(projectRoot, path, IdHistorySchema)
}

export async function saveIdHistory(
    path: string,
    { createdAt, formerIds }: IdHistoryRecord,
): Promise<void> {
    if (createdAt === undefined && formerIds === undefined) {
        return
    }
    await saveJsonFile(path, { createdAt, formerIds })
}
