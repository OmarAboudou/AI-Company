import type Anthropic from "@anthropic-ai/sdk"
import {
    type AnthropicMessagesCall,
    callAnthropicMessages,
} from "../../llm/anthropic-messages/call-anthropic-messages.ts"
import type { TaskEnding, Tool, ToolContext } from "../tool/define-tool.ts"
import { runToolCall } from "../tool/run-tool-call.ts"
import { getAnthropicTools } from "./get-anthropic-tools.ts"
import type { TokenUsage } from "./schema.ts"
import { appendRunTranscriptLine } from "./storage.ts"

export type RunProgress =
    | { kind: "text"; text: string }
    | { kind: "tool-call"; name: string; input: unknown }
    | { kind: "tool-result"; name: string; text: string; isError: boolean }
    | { kind: "reminder"; text: string }

export type ToolLoop = Pick<
    AnthropicMessagesCall,
    "connection" | "apiKey" | "apiId" | "systemPrompt"
> & {
    ctx: ToolContext
    userMessage: string
    tools: Record<string, Tool>
    onProgress: (progress: RunProgress) => void
}

export type RunToolLoopResult = { taskEnding: TaskEnding; usage: TokenUsage }

export const reminderText =
    "You ended your turn without calling a tool, and only tools act: what you write outside them reaches no one. Call task_complete with a summary if your task is done, or task_fail with the reason if you can't do it."

function addUsage(usage: TokenUsage, addedUsage: Anthropic.Usage): TokenUsage {
    return {
        inputTokens: usage.inputTokens + addedUsage.input_tokens,
        outputTokens: usage.outputTokens + addedUsage.output_tokens,
        cacheReadInputTokens:
            usage.cacheReadInputTokens +
            (addedUsage.cache_read_input_tokens ?? 0),
        cacheCreationInputTokens:
            usage.cacheCreationInputTokens +
            (addedUsage.cache_creation_input_tokens ?? 0),
    }
}

async function runToolUses(
    toolUses: Anthropic.ToolUseBlock[],
    { tools, ctx, onProgress }: ToolLoop,
) {
    const toolResults: Anthropic.ToolResultBlockParam[] = []
    let taskEnding: TaskEnding | undefined
    for (const { id, name, input } of toolUses) {
        onProgress({ kind: "tool-call", name, input })
        const result = await runToolCall(tools, { name, input }, ctx)
        onProgress({ kind: "tool-result", name, ...result })
        toolResults.push({
            type: "tool_result",
            tool_use_id: id,
            content: result.text,
            ...(result.isError && { is_error: true }),
        })
        taskEnding ??= result.taskEnding
    }
    return { toolResults, taskEnding }
}

export async function runToolLoop(loop: ToolLoop): Promise<RunToolLoopResult> {
    const { ctx, connection, apiKey, apiId, systemPrompt, onProgress } = loop
    const tools = getAnthropicTools(loop.tools)
    const turns: Anthropic.MessageParam[] = []
    let usage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
    }
    let hasBeenReminded = false
    async function addUserTurn(content: Anthropic.ContentBlockParam[]) {
        turns.push({ role: "user", content })
        await appendRunTranscriptLine(ctx.projectRoot, ctx.runId, {
            type: "user",
            content,
        })
    }
    await appendRunTranscriptLine(ctx.projectRoot, ctx.runId, {
        type: "start",
        apiId,
        systemPrompt,
        tools,
    })
    await addUserTurn([{ type: "text", text: loop.userMessage }])
    while (true) {
        const message = await callAnthropicMessages({
            connection,
            apiKey,
            apiId,
            systemPrompt,
            tools,
            turns,
            onText: (text) => onProgress({ kind: "text", text }),
        })
        turns.push({ role: "assistant", content: message.content })
        await appendRunTranscriptLine(ctx.projectRoot, ctx.runId, {
            type: "assistant",
            message,
        })
        usage = addUsage(usage, message.usage)
        const toolUses = message.content.filter(
            (block) => block.type === "tool_use",
        )
        if (toolUses.length === 0) {
            if (hasBeenReminded) {
                const reason =
                    "The model ended two turns without calling a tool, the second after a reminder."
                return { taskEnding: { state: "failed", reason }, usage }
            }
            hasBeenReminded = true
            onProgress({ kind: "reminder", text: reminderText })
            await addUserTurn([{ type: "text", text: reminderText }])
            continue
        }
        const { toolResults, taskEnding } = await runToolUses(toolUses, loop)
        await addUserTurn(toolResults)
        if (taskEnding !== undefined) {
            return { taskEnding, usage }
        }
    }
}
