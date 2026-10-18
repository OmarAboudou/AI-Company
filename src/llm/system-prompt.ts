import type { Company } from "../company/company.ts"
import type { Employee } from "../employee/employee.ts"
import type { Position } from "../position/position.ts"
import type { Thread } from "../thread/thread.ts"

export type PromptContext = {
    company: Company
    position: Position
    employee: Employee
    thread: Thread
}

function section(title: string, text: string): string[] {
    const trimmed = text.trim()
    return trimmed === "" ? [] : [`# ${title}`, "", trimmed, ""]
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
        ...section(company.name, company.description),
        ...section(`Your position: ${position.title}`, position.description),
        "# Messages",
        "",
        `You work through threads of messages between the company's positions. This thread is "${thread.subject}".`,
        "",
        `Each message written by someone else starts with a line llmco adds, such as "From: Omar Aboudou, Director (@director), 2026-10-18 14:03 UTC", naming its author and the position they write from; what follows is the message as its author wrote it. Messages from @${company.directorPositionId} come from the company's management.`,
        "",
        "Your answer is posted as your message in the thread, in Markdown. To ask a position to act, mention it as @position-id: a position you don't mention isn't asked anything.",
    ].join("\n")
}
