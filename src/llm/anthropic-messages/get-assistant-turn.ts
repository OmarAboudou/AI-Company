import type Anthropic from "@anthropic-ai/sdk"
import type {
    AssistantTurn,
    ModelTurn,
    TokenUsage,
    TurnStop,
} from "../conversation/schema.ts"

function getBlocks(message: Anthropic.Message): AssistantTurn["blocks"] {
    return message.content.flatMap((block): AssistantTurn["blocks"] => {
        switch (block.type) {
            case "text":
                return [{ type: "text", text: block.text }]
            case "tool_use": {
                const { id, name, input } = block
                return [{ type: "tool-call", id, name, input }]
            }
            default:
                return []
        }
    })
}

function getUsage(usage: Anthropic.Usage): TokenUsage {
    return {
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
        cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
    }
}

function getStop(message: Anthropic.Message): TurnStop {
    switch (message.stop_reason) {
        case "refusal": {
            const category = message.stop_details?.category
            return { reason: "refusal", ...(category && { category }) }
        }
        case "max_tokens":
            return { reason: "max-length" }
        case "model_context_window_exceeded":
            return { reason: "context-window-exceeded" }
        default:
            return { reason: "end" }
    }
}

export function getAssistantTurn(message: Anthropic.Message): ModelTurn {
    return {
        role: "assistant",
        blocks: getBlocks(message),
        modelResponse: {
            protocol: "anthropic-messages",
            payload: message,
            usage: getUsage(message.usage),
            stop: getStop(message),
        },
    }
}
