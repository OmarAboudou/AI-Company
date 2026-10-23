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
        "What you write outside your tools joins the discussion of your task's ticket, for the other position to read in a later session: write it for a reader who doesn't see this one. Your session ends at an act that passes the hand on the ticket, or at a turn without any tool call, after which the ticket is resumed in a later session.",
    ].join("\n")
}
