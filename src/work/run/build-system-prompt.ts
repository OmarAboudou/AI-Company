import type { Company } from "../../organization/company/schema.ts"
import type { Employee } from "../../organization/employee/schema.ts"
import type { Position } from "../../organization/position/schema.ts"

export type SystemPromptContext = {
    company: Company
    position: Position
    employee: Employee
}

function buildSection(title: string, tag: string, text: string): string[] {
    const trimmedText = text.trim()
    return trimmedText === ""
        ? []
        : [`# ${title}`, "", `<${tag}>`, trimmedText, `</${tag}>`, ""]
}

export function buildSystemPrompt({
    company,
    position,
    employee,
}: SystemPromptContext): string {
    return [
        `You are ${employee.name}, ${position.title} (@${position.id}) at ${company.name}.`,
        "",
        ...buildSection(
            company.name,
            "company_description",
            company.description,
        ),
        ...buildSection(
            `Your position: ${position.title}`,
            "position_description",
            position.description,
        ),
        "# Your tasks",
        "",
        "Only your tools act: what you write outside them reaches no one. End each task with task_complete, or with task_fail if you can't do it.",
    ].join("\n")
}
