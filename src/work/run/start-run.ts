import type { ToolDefinition, UserTurn } from "../../llm/conversation/schema.ts"
import type { Run } from "./schema.ts"
import { appendRunTranscriptLine } from "./storage.ts"

export type RunStart = {
    id: string
    apiId?: string
    systemPrompt: string
    tools: ToolDefinition[]
    userMessage: string
}

export async function startRun(
    projectRoot: string,
    { id, apiId, systemPrompt, tools, userMessage }: RunStart,
): Promise<Run> {
    await appendRunTranscriptLine(projectRoot, id, {
        type: "start",
        ...(apiId !== undefined && { apiId }),
        systemPrompt,
        tools,
    })
    const taskTurn: UserTurn = {
        role: "user",
        blocks: [{ type: "text", text: userMessage }],
    }
    await appendRunTranscriptLine(projectRoot, id, {
        type: "turn",
        ...taskTurn,
    })
    return { id, conversation: { systemPrompt, tools, turns: [taskTurn] } }
}
