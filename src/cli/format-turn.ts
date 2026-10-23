import type {
    AssistantTurn,
    ToolResultBlock,
    UserTurn,
} from "../llm/conversation/schema.ts"
import { formatToolInput } from "./format-tool-input.ts"

function formatToolResult({ text, isError }: ToolResultBlock): string[] {
    const [firstLine = "", ...otherLines] = text.split("\n")
    return [
        `${isError ? "✗" : "←"} ${firstLine}`,
        ...otherLines.map((line) => (line === "" ? "" : `  ${line}`)),
    ]
}

export function formatTurn(
    blocks: AssistantTurn["blocks"],
    answeringTurn?: UserTurn,
): string {
    const answerBlocks = answeringTurn?.blocks ?? []
    const toolResults = answerBlocks.filter(
        (block) => block.type === "tool-result",
    )
    const turnLines = blocks.flatMap((block) => {
        if (block.type === "text") {
            return block.text.trimEnd().split("\n")
        }
        const toolResult = toolResults.find(
            ({ toolCallId }) => toolCallId === block.id,
        )
        return [
            `→ ${block.name}`,
            ...formatToolInput(block.input),
            ...(toolResult === undefined ? [] : formatToolResult(toolResult)),
        ]
    })
    return turnLines.join("\n")
}
