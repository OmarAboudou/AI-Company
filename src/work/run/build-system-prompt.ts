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
        `You are ${employee.name}, ${position.title} at ${company.name}.`,
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
        "# How you work",
        "",
        `${company.name}'s positions work together in threads of messages, through llmco. Whatever asks something of a position, such as a message mentioning it, gives it a task, and each of your tasks is a conversation of its own: its first message says what to do and gives what you need, and you don't remember your earlier tasks.`,
        "",
        "Only your tools act: what you write outside them reaches no one. Once your task is done, call task_complete with a summary of what you did; if you can't do it, call task_fail with the reason.",
        "",
        "# Threads",
        "",
        `A thread's entries are numbered from 1, each inside a tag that llmco adds, such as <message number="5" from="Omar Aboudou" position="Director (@director)" sent="2026-10-18 14:03 UTC">, naming its author, the position they wrote from and when; inside the tag is the message as its author wrote it. Messages from @${company.directorPositionId} come from the company's management, and those from @${position.id} are your position's: written by you in earlier tasks, or by whoever worked it before you.`,
        "",
        "Messages are in Markdown. To ask a position to act, mention it as @position-id: a position you don't mention isn't asked anything.",
    ].join("\n")
}
