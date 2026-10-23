import { describe, expect, test } from "bun:test"
import {
    buildSystemPrompt,
    type SystemPromptContext,
} from "./build-system-prompt.ts"

const context: SystemPromptContext = {
    company: { name: "Acme", directorPositionId: "director" },
    project: { description: "We build things.\n" },
    position: {
        id: "backend-developer",
        title: "Backend Developer",
        description: "You build the API.",
    },
    workerName: "Claude Senior",
}

describe("buildSystemPrompt", () => {
    test("starts with who works the task, where and as what", () => {
        const prompt = buildSystemPrompt(context)
        const identityLine =
            "You are Claude Senior, Backend Developer (@backend-developer) at Acme."

        expect(prompt.split("\n")[0]).toBe(identityLine)
    })

    test("gives the project's and the position's descriptions", () => {
        const prompt = buildSystemPrompt(context)

        const projectLines = [
            "# The project",
            "",
            "<project_description>",
            "We build things.",
            "</project_description>",
        ]
        const positionLines = [
            "# Your position: Backend Developer",
            "",
            "<position_description>",
            "You build the API.",
            "</position_description>",
        ]

        expect(prompt).toContain(`${projectLines.join("\n")}\n\n`)
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
        const project = { description: "  \n" }

        const prompt = buildSystemPrompt({ ...context, project })

        expect(prompt).not.toContain("# The project")
        expect(prompt).toContain("# Your position: Backend Developer")
    })

    test("ends with the rule of every task: only tools act", () => {
        const prompt = buildSystemPrompt(context)

        const rule =
            "Only your tools act: what you write outside them reaches no one. End each task with task_mark-as-done, or with task_mark-as-failed if you can't do it."
        expect(prompt).toEndWith(`# Your tasks\n\n${rule}`)
    })
})
