import {
    type AnthropicMessagesCall,
    callAnthropicMessages,
} from "../../llm/anthropic-messages/call-anthropic-messages.ts"
import type { ModelTurn, TokenUsage } from "../../llm/conversation/schema.ts"
import { UserError } from "../../user-error.ts"
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
    const { connection, apiKey, apiId, onProgress, loadCancellationReason } =
        loop
    let { run } = loop
    let usage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
    }
    while (true) {
        const cancellationReason = await loadCancellationReason?.()
        if (cancellationReason !== undefined) {
            const taskEnding: TaskEnding = {
                state: "cancelled",
                reason: cancellationReason,
            }
            return { taskEnding, usage }
        }
        let modelTurn: ModelTurn
        try {
            modelTurn = await callAnthropicMessages({
                connection,
                apiKey,
                apiId,
                conversation: run.conversation,
                onText: (text) => onProgress?.({ kind: "text", text }),
            })
        } catch (error) {
            if (!(error instanceof UserError)) {
                throw error
            }
            const taskEnding: TaskEnding = {
                state: "failed",
                reason: error.message,
            }
            return { taskEnding, usage }
        }
        usage = addUsage(usage, modelTurn.modelResponse.usage)
        const application = await applyAssistantTurn(run, modelTurn, loop)
        if (application.taskEnding !== undefined) {
            return { taskEnding: application.taskEnding, usage }
        }
        run = application.run
    }
}
