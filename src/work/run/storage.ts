import { join } from "node:path"
import { appendStateLine } from "../../files/append-state-line.ts"
import { getStateFolderPath } from "../../files/get-state-folder-path.ts"
import type {
    ConversationTurn,
    ToolDefinition,
} from "../../llm/conversation/schema.ts"

export type NewRunTranscriptLine =
    | {
          type: "start"
          apiId: string
          systemPrompt: string
          tools: ToolDefinition[]
      }
    | ({ type: "turn" } & ConversationTurn)

export type RunTranscriptLine = { at: string } & NewRunTranscriptLine

function getRunTranscriptPath(projectRoot: string, runId: string): string {
    return join(getStateFolderPath(projectRoot), "runs", `${runId}.jsonl`)
}

export async function appendRunTranscriptLine(
    projectRoot: string,
    runId: string,
    newLine: NewRunTranscriptLine,
): Promise<void> {
    const line: RunTranscriptLine = { at: new Date().toISOString(), ...newLine }
    await appendStateLine(
        projectRoot,
        getRunTranscriptPath(projectRoot, runId),
        line,
    )
}

export async function listRunTranscriptLines(
    projectRoot: string,
    runId: string,
): Promise<unknown[]> {
    const text = await Bun.file(getRunTranscriptPath(projectRoot, runId)).text()
    return text
        .trimEnd()
        .split("\n")
        .map((line) => JSON.parse(line))
}
