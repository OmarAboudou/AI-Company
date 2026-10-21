import { join, relative } from "node:path"
import { appendStateLine } from "../../files/append-state-line.ts"
import { getStateFolderPath } from "../../files/get-state-folder-path.ts"
import { parseJsonText } from "../../files/parse-json-text.ts"
import { readTextFile } from "../../files/read-text-file.ts"
import type {
    ConversationTurn,
    ToolDefinition,
} from "../../llm/conversation/schema.ts"
import { UserError } from "../../user-error.ts"
import { type Run, type RunSession, RunTranscriptLineSchema } from "./schema.ts"

export type NewRunTranscriptLine =
    | {
          type: "start"
          apiId?: string
          systemPrompt: string
          tools: ToolDefinition[]
          session: RunSession
      }
    | ({ type: "turn" } & ConversationTurn)

function getRunTranscriptPath(projectRoot: string, runId: string): string {
    return join(getStateFolderPath(projectRoot), "runs", `${runId}.jsonl`)
}

export async function appendRunTranscriptLine(
    projectRoot: string,
    runId: string,
    newLine: NewRunTranscriptLine,
): Promise<void> {
    await appendStateLine(
        projectRoot,
        getRunTranscriptPath(projectRoot, runId),
        { at: new Date().toISOString(), ...newLine },
    )
}

export async function hasRun(
    projectRoot: string,
    id: string,
): Promise<boolean> {
    return Bun.file(getRunTranscriptPath(projectRoot, id)).exists()
}

export async function loadRun(projectRoot: string, id: string): Promise<Run> {
    const path = getRunTranscriptPath(projectRoot, id)
    const displayPath = relative(projectRoot, path)
    const [startLine, ...turnLines] = (await readTextFile(projectRoot, path))
        .trimEnd()
        .split("\n")
        .map((text, index) =>
            parseJsonText(
                text,
                RunTranscriptLineSchema,
                `${displayPath}, line ${index + 1}`,
            ),
        )
    if (startLine?.type !== "start") {
        throw new UserError(
            `Invalid ${displayPath}: its first line isn't the run's start.`,
        )
    }
    const turns = turnLines.map((line, index) => {
        if (line.type !== "turn") {
            throw new UserError(
                `Invalid ${displayPath}, line ${index + 2}: the run already started at line 1.`,
            )
        }
        const { at, type, ...turn } = line
        return turn
    })
    const { systemPrompt, tools, session } = startLine
    return { id, conversation: { systemPrompt, tools, turns }, session }
}
