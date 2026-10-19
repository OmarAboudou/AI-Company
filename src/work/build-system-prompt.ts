import type { Thread } from "../messaging/thread/schema.ts"
import type { Company } from "../organization/company/schema.ts"
import type { Employee } from "../organization/employee/schema.ts"
import type { Position } from "../organization/position/schema.ts"

export type PromptContext = {
    company: Company
    position: Position
    employee: Employee
    thread: Thread
}

function section(title: string, tag: string, text: string): string[] {
    const trimmed = text.trim()
    return trimmed === ""
        ? []
        : [`# ${title}`, "", `<${tag}>`, trimmed, `</${tag}>`, ""]
}

export function systemPrompt({
    company,
    position,
    employee,
    thread,
}: PromptContext): string {
    return [
        `You are ${employee.name}, ${position.title} at ${company.name}.`,
        "",
        ...section(company.name, "company_description", company.description),
        ...section(
            `Your position: ${position.title}`,
            "position_description",
            position.description,
        ),
        "# Messages",
        "",
        `You work through threads of messages between the company's positions. This thread is "${thread.subject}".`,
        "",
        `Each message written by someone else comes inside a <message> tag that llmco adds, such as <message from="Omar Aboudou" position="Director (@director)" sent="2026-10-18 14:03 UTC">, naming its author, the position they write from and when; inside the tag is the message as its author wrote it. Messages from @${company.directorPositionId} come from the company's management.`,
        "",
        "Your answer is posted as your message in the thread, in Markdown. To ask a position to act, mention it as @position-id: a position you don't mention isn't asked anything.",
    ].join("\n")
}
