import {
    type AnthropicMessagesCall,
    callAnthropicMessages,
} from "../../llm/anthropic-messages/call-anthropic-messages.ts"
import type { TokenUsage } from "../../llm/conversation/schema.ts"
import type { TaskEnding } from "../tool/define-tool.ts"
import {
    applyAssistantTurn,
    type TurnApplication,
} from "./apply-assistant-turn.ts"
import type { Run } from "./schema.ts"

export type ToolLoop = Pick<
    AnthropicMessagesCall,
    "connection" | "apiKey" | "apiId"
> &
    TurnApplication & { run: Run }

export type RunToolLoopResult = { taskEnding: TaskEnding; usage: TokenUsage }

function addUsage(usage: TokenUsage, addedUsage: TokenUsage): TokenUsage {
    return {
        inputTokens: usage.inputTokens + addedUsage.inputTokens,
        outputTokens: usage.outputTokens + addedUsage.outputTokens,
        cacheReadInputTokens:
            usage.cacheReadInputTokens + addedUsage.cacheReadInputTokens,
        cacheCreationInputTokens:
            usage.cacheCreationInputTokens +
            addedUsage.cacheCreationInputTokens,
    }
}

export async function runToolLoop(loop: ToolLoop): Promise<RunToolLoopResult> {
    const { connection, apiKey, apiId, onProgress } = loop
    let { run } = loop
    let usage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
    }
    while (true) {
        const modelTurn = await callAnthropicMessages({
            connection,
            apiKey,
            apiId,
            conversation: run.conversation,
            onText: (text) => onProgress({ kind: "text", text }),
        })
        usage = addUsage(usage, modelTurn.modelResponse.usage)
        const application = await applyAssistantTurn(run, modelTurn, loop)
        if (application.taskEnding !== undefined) {
            return { taskEnding: application.taskEnding, usage }
        }
        run = application.run
    }
}
