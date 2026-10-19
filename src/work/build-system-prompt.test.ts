import { describe, expect, test } from "bun:test"
import { type PromptContext, systemPrompt } from "./build-system-prompt.ts"

const context: PromptContext = {
    company: {
        name: "Acme",
        directorPositionId: "director",
        description: "We build things.\n",
    },
    position: {
        id: "backend-developer",
        title: "Backend Developer",
        description: "You build the API.",
    },
    employee: {
        id: "claude-senior",
        name: "Claude Senior",
        kind: "llm",
        providerId: "anthropic",
        modelId: "claude-opus-5-5",
    },
    thread: {
        id: "2026-10-18-choice-of-framework",
        subject: "Choice of framework",
        createdAt: "2026-10-18T14:03:22.123Z",
        createdBy: {
            position: { id: "director", title: "Director" },
            committer: { name: "Omar Aboudou", email: "omar@example.com" },
        },
    },
}

describe("systemPrompt", () => {
    test("starts with who the employee is, where and as what", () => {
        const prompt = systemPrompt(context)
        const identity = "You are Claude Senior, Backend Developer at Acme."

        expect(prompt.split("\n")[0]).toBe(identity)
    })

    test("gives the company's and the position's descriptions", () => {
        const prompt = systemPrompt(context)

        const company = [
            "# Acme",
            "",
            "<company_description>",
            "We build things.",
            "</company_description>",
        ]
        const position = [
            "# Your position: Backend Developer",
            "",
            "<position_description>",
            "You build the API.",
            "</position_description>",
        ]

        expect(prompt).toContain(`${company.join("\n")}\n\n`)
        expect(prompt).toContain(`${position.join("\n")}\n\n`)
    })

    test("keeps a description's own headings inside its tags", () => {
        const description = "# Goals\n\nShip the API."
        const position = { ...context.position, description }

        const prompt = systemPrompt({ ...context, position })

        expect(prompt).toContain(
            `<position_description>\n${description}\n</position_description>`,
        )
    })

    test("leaves out a section whose description is empty", () => {
        const company = { ...context.company, description: "  \n" }

        const prompt = systemPrompt({ ...context, company })

        expect(prompt).not.toContain("# Acme")
        expect(prompt).toContain("# Your position: Backend Developer")
    })

    test("names the thread, the message tag, the director and mentions", () => {
        const prompt = systemPrompt(context)

        expect(prompt).toContain('This thread is "Choice of framework".')
        expect(prompt).toContain("comes inside a <message> tag")
        expect(prompt).toContain("Messages from @director come from")
        expect(prompt).toContain("mention it as @position-id")
    })
})
