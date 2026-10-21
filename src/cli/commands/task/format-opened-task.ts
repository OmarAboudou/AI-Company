import type { ToolDefinition } from "../../../llm/conversation/schema.ts"
import { formatPositionLabel } from "../../../messaging/message/format-position-label.ts"
import type { OpenedTask } from "../../../work/task/open-next-task.ts"

type InputProperty = { type?: string; description?: string }

function formatToolInputs({ inputSchema }: ToolDefinition): string[] {
    const properties = (inputSchema.properties ?? {}) as Record<
        string,
        InputProperty
    >
    const requiredNames = (inputSchema.required ?? []) as string[]
    return Object.entries(properties).map(([name, { type, description }]) => {
        const qualities = [
            type ?? "any",
            ...(requiredNames.includes(name) ? [] : ["optional"]),
        ]
        const meaning = description === undefined ? "" : `: ${description}`
        return `  ${name} (${qualities.join(", ")})${meaning}`
    })
}

function formatTool(tool: ToolDefinition): string {
    return [
        `${tool.name}: ${tool.description}`,
        ...formatToolInputs(tool),
    ].join("\n")
}

function formatSection(title: string, text: string): string {
    return `── ${title} ──\n${text.trimEnd()}`
}

export function formatOpenedTask({
    task,
    position,
    run,
    taskDepth,
    maxTaskDepth,
    isResumed,
}: OpenedTask): string {
    const { systemPrompt, tools, turns } = run.conversation
    const [taskTurn] = turns
    const message = (taskTurn?.blocks ?? [])
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("\n")
    const opening = isResumed ? "Resumed task" : "Task"
    return [
        `${opening} "${task.id}", ${task.type}, as ${formatPositionLabel(position)}: link ${taskDepth} of its chain, which stops beyond ${maxTaskDepth} links.`,
        formatSection("System prompt", systemPrompt),
        formatSection("Message", message),
        formatSection("Tools", tools.map(formatTool).join("\n\n")),
    ].join("\n\n")
}
