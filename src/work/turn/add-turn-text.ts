import { loadJournal } from "../../journal/storage.ts"
import { UserError } from "../../user-error.ts"
import { requireRunInProgress } from "./require-run-in-progress.ts"
import type { StagedTurn } from "./schema.ts"
import { loadStagedTurn, saveStagedTurn } from "./storage.ts"

export async function addTurnText(
    projectRoot: string,
    environment: NodeJS.ProcessEnv,
    text: string,
): Promise<StagedTurn> {
    if (text.trim() === "") {
        throw new UserError("The text is empty.")
    }
    const journal = await loadJournal(projectRoot)
    const { run } = await requireRunInProgress(journal, environment)
    const { blocks } = await loadStagedTurn(projectRoot, run.id)
    const stagedTurn: StagedTurn = {
        blocks: [...blocks, { type: "text", text }],
    }
    await saveStagedTurn(projectRoot, run.id, stagedTurn)
    return stagedTurn
}
