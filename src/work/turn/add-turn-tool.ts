import { randomBytes } from "node:crypto"
import { z } from "zod"
import { loadJournal } from "../../journal/storage.ts"
import { UserError } from "../../user-error.ts"
import { requireRunTools } from "../run/require-run-tools.ts"
import { requireRunInProgress } from "./require-run-in-progress.ts"
import type { StagedTurn } from "./schema.ts"
import { loadStagedTurn, saveStagedTurn } from "./storage.ts"

export type ToolCallToAdd = { toolName: string; rawInput: string }

function parseToolInput(rawInput: string): Record<string, unknown> {
    let input: unknown
    try {
        input = JSON.parse(rawInput)
    } catch (error) {
        if (!(error instanceof SyntaxError)) {
            throw error
        }
        throw new UserError(
            `The input isn't JSON (${error.message}): give an object, e.g. '{"body": "Hello."}'.`,
        )
    }
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
        throw new UserError(
            `The input is ${JSON.stringify(input)}: give an object, e.g. '{"body": "Hello."}'.`,
        )
    }
    return input as Record<string, unknown>
}

export async function addTurnTool(
    projectRoot: string,
    environment: NodeJS.ProcessEnv,
    { toolName, rawInput }: ToolCallToAdd,
): Promise<StagedTurn> {
    const input = parseToolInput(rawInput)
    const journal = await loadJournal(projectRoot)
    const { run } = await requireRunInProgress(journal, environment)
    const tools = requireRunTools(run.session)
    const tool = tools[toolName]
    if (tool === undefined) {
        throw new UserError(
            `There is no tool named ${toolName}. The tools you can call are: ${Object.keys(tools).join(", ")}.`,
        )
    }
    const validation = tool.inputSchema.safeParse(input)
    if (!validation.success) {
        throw new UserError(
            `Invalid input for ${toolName}:\n${z.prettifyError(validation.error)}`,
        )
    }
    const { blocks } = await loadStagedTurn(projectRoot, run.id)
    const toolCall = {
        type: "tool-call" as const,
        id: `call_${randomBytes(6).toString("hex")}`,
        name: toolName,
        input,
    }
    const stagedTurn: StagedTurn = { blocks: [...blocks, toolCall] }
    await saveStagedTurn(projectRoot, run.id, stagedTurn)
    return stagedTurn
}
