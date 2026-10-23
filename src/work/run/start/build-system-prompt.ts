import { formatPositionLabel } from "../../../messaging/message/format-position-label.ts"
import type { Company } from "../../../organization/company/schema.ts"
import type { Position } from "../../../organization/position/schema.ts"
import type { Project } from "../../../organization/project/schema.ts"

export type SystemPromptContext = {
    company: Company
    project: Project
    position: Position
    workerName: string
}

function buildSection(title: string, tag: string, text: string): string[] {
    const trimmedText = text.trim()
    return trimmedText === ""
        ? []
        : [`# ${title}`, "", `<${tag}>`, trimmedText, `</${tag}>`, ""]
}

export function buildSystemPrompt({
    company,
    project,
    position,
    workerName,
}: SystemPromptContext): string {
    return [
        `You are ${workerName}, ${formatPositionLabel(position)} at ${company.name}.`,
        "",
        ...buildSection(
            "The project",
            "project_description",
            project.description,
        ),
        ...buildSection(
            `Your position: ${position.title}`,
            "position_description",
            position.description,
        ),
        "# Your tasks",
        "",
        "Only your tools act: what you write outside them reaches no one. End each task with task_mark-as-done, or with task_mark-as-failed if you can't do it.",
    ].join("\n")
}
