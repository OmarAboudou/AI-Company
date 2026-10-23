import type {
    ToolDefinition,
    UserTurn,
} from "../../../llm/conversation/schema.ts"
import type { Run, RunSession } from "../schema.ts"
import { appendRunTranscriptLine } from "../storage.ts"

export type RunStart = {
    id: string
    apiId?: string
    systemPrompt: string
    tools: ToolDefinition[]
    userMessage: string
    session: RunSession
}

export async function startRun(
    projectRoot: string,
    { id, apiId, systemPrompt, tools, userMessage, session }: RunStart,
): Promise<Run> {
    await appendRunTranscriptLine(projectRoot, id, {
        type: "start",
        ...(apiId !== undefined && { apiId }),
        systemPrompt,
        tools,
        session,
    })
    const taskTurn: UserTurn = {
        role: "user",
        blocks: [{ type: "text", text: userMessage }],
    }
    await appendRunTranscriptLine(projectRoot, id, {
        type: "turn",
        ...taskTurn,
    })
    const conversation = { systemPrompt, tools, turns: [taskTurn] }
    return { id, conversation, session }
}
