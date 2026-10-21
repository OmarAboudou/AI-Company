import { rm } from "node:fs/promises"
import { join } from "node:path"
import { getStateFolderPath } from "../../files/get-state-folder-path.ts"
import { readJsonFile } from "../../files/read-json-file.ts"
import { saveState } from "../../files/save-state.ts"
import { type StagedTurn, StagedTurnSchema } from "./schema.ts"

function getStagedTurnPath(projectRoot: string, runId: string): string {
    return join(getStateFolderPath(projectRoot), "runs", `${runId}.turn.json`)
}

export async function loadStagedTurn(
    projectRoot: string,
    runId: string,
): Promise<StagedTurn> {
    const path = getStagedTurnPath(projectRoot, runId)
    if (!(await Bun.file(path).exists())) {
        return { blocks: [] }
    }
    return readJsonFile(projectRoot, path, StagedTurnSchema)
}

export async function saveStagedTurn(
    projectRoot: string,
    runId: string,
    stagedTurn: StagedTurn,
): Promise<void> {
    await saveState(
        projectRoot,
        getStagedTurnPath(projectRoot, runId),
        stagedTurn,
    )
}

export async function deleteStagedTurn(
    projectRoot: string,
    runId: string,
): Promise<void> {
    await rm(getStagedTurnPath(projectRoot, runId), { force: true })
}
