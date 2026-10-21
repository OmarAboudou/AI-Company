import { describe, expect, test } from "bun:test"
import {
    buildSystemPrompt,
    type SystemPromptContext,
} from "./build-system-prompt.ts"

const context: SystemPromptContext = {
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
}

describe("buildSystemPrompt", () => {
    test("starts with who the employee is, where and as what", () => {
        const prompt = buildSystemPrompt(context)
        const identityLine = "You are Claude Senior, Backend Developer at Acme."

        expect(prompt.split("\n")[0]).toBe(identityLine)
    })

    test("gives the company's and the position's descriptions", () => {
        const prompt = buildSystemPrompt(context)

        const companyLines = [
            "# Acme",
            "",
            "<company_description>",
            "We build things.",
            "</company_description>",
        ]
        const positionLines = [
            "# Your position: Backend Developer",
            "",
            "<position_description>",
            "You build the API.",
            "</position_description>",
        ]

        expect(prompt).toContain(`${companyLines.join("\n")}\n\n`)
        expect(prompt).toContain(`${positionLines.join("\n")}\n\n`)
    })

    test("keeps a description's own headings inside its tags", () => {
        const description = "# Goals\n\nShip the API."
        const position = { ...context.position, description }

        const prompt = buildSystemPrompt({ ...context, position })

        expect(prompt).toContain(
            `<position_description>\n${description}\n</position_description>`,
        )
    })

    test("leaves out a section whose description is empty", () => {
        const company = { ...context.company, description: "  \n" }

        const prompt = buildSystemPrompt({ ...context, company })

        expect(prompt).not.toContain("# Acme")
        expect(prompt).toContain("# Your position: Backend Developer")
    })

    test("tells that tasks end with task_complete or task_fail", () => {
        const prompt = buildSystemPrompt(context)

        expect(prompt).toContain("call task_complete with a summary")
        expect(prompt).toContain("call task_fail with the reason")
    })

    test("names the entries' tag, the director and the position's messages", () => {
        const prompt = buildSystemPrompt(context)

        expect(prompt).toContain('<message number="5" from="Omar Aboudou"')
        expect(prompt).toContain("Messages from @director come from")
        expect(prompt).toContain("those from @backend-developer are your")
        expect(prompt).toContain("mention it as @position-id")
    })
})
