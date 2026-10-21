import { loadJournal } from "../../journal/storage.ts"
import { requireRunInProgress } from "./require-run-in-progress.ts"
import type { StagedTurn } from "./schema.ts"
import { loadStagedTurn } from "./storage.ts"

export async function loadCurrentStagedTurn(
    projectRoot: string,
    environment: NodeJS.ProcessEnv,
): Promise<StagedTurn> {
    const journal = await loadJournal(projectRoot)
    const { run } = await requireRunInProgress(journal, environment)
    return loadStagedTurn(projectRoot, run.id)
}
