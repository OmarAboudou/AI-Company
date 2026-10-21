import type Anthropic from "@anthropic-ai/sdk"
import type {
    AssistantTurn,
    ConversationTurn,
    UserTurn,
} from "../conversation/schema.ts"

function getUserContent(turn: UserTurn): Anthropic.ContentBlockParam[] {
    return turn.blocks.map((block) =>
        block.type === "text"
            ? { type: "text", text: block.text }
            : {
                  type: "tool_result",
                  tool_use_id: block.toolCallId,
                  content: block.text,
                  ...(block.isError && { is_error: true }),
              },
    )
}

function getAssistantContent(
    turn: AssistantTurn,
): Anthropic.ContentBlockParam[] {
    const { modelResponse } = turn
    if (modelResponse?.protocol === "anthropic-messages") {
        return (modelResponse.payload as Anthropic.Message).content
    }
    return turn.blocks.map((block) =>
        block.type === "text"
            ? { type: "text", text: block.text }
            : {
                  type: "tool_use",
                  id: block.id,
                  name: block.name,
                  input: block.input,
              },
    )
}

export function getAnthropicTurns(
    turns: ConversationTurn[],
): Anthropic.MessageParam[] {
    return turns.map((turn) =>
        turn.role === "user"
            ? { role: "user", content: getUserContent(turn) }
            : { role: "assistant", content: getAssistantContent(turn) },
    )
}
