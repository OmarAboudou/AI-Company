import { describe, expect, test } from "bun:test"
import { type PromptContext, systemPrompt } from "./system-prompt.ts"

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

        const position = "# Your position: Backend Developer"

        expect(prompt).toContain("# Acme\n\nWe build things.\n\n")
        expect(prompt).toContain(`${position}\n\nYou build the API.\n\n`)
    })

    test("leaves out a section whose description is empty", () => {
        const company = { ...context.company, description: "  \n" }

        const prompt = systemPrompt({ ...context, company })

        expect(prompt).not.toContain("# Acme")
        expect(prompt).toContain("# Your position: Backend Developer")
    })

    test("names the thread, the director's position and mentions", () => {
        const prompt = systemPrompt(context)

        expect(prompt).toContain('This thread is "Choice of framework".')
        expect(prompt).toContain("Messages from @director come from")
        expect(prompt).toContain("mention it as @position-id")
    })
})
