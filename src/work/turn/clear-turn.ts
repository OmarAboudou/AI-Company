import { loadJournal } from "../../journal/storage.ts"
import { requireRunInProgress } from "./require-run-in-progress.ts"
import { deleteStagedTurn } from "./storage.ts"

export async function clearTurn(
    projectRoot: string,
    environment: NodeJS.ProcessEnv,
): Promise<void> {
    const journal = await loadJournal(projectRoot)
    const { run } = await requireRunInProgress(journal, environment)
    await deleteStagedTurn(projectRoot, run.id)
}
