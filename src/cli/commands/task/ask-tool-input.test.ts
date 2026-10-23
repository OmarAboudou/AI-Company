import { describe, expect, test } from "bun:test"
import type { ToolDefinition } from "../../../llm/conversation/schema.ts"
import { getRunTools } from "../../../work/run/get-run-tools.ts"
import { getToolDefinitions } from "../../../work/tool/get-tool-definitions.ts"
import {
    askToolInput,
    type ToolInputPrompts,
    type ToolInputQuestion,
} from "./ask-tool-input.ts"

const ticketNumber = 1

const toolDefinitions = getToolDefinitions(
    getRunTools(["message_send", "ticket_show"], {
        message_send: { ticketNumber },
        ticket_show: { ticketNumber },
    }),
)

function getToolDefinition(name: string): ToolDefinition {
    const tool = toolDefinitions.find((definition) => {
        return definition.name === name
    })
    if (tool === undefined) {
        throw new Error(`No tool definition is named ${name}`)
    }
    return tool
}

type PromptAnswers = {
    lines?: string[]
    texts?: string[]
    numbers?: (number | undefined)[]
}

function createPrompts({
    lines = [],
    texts = [],
    numbers = [],
}: PromptAnswers) {
    const questions: (ToolInputQuestion & { kind: string })[] = []
    const prompts: ToolInputPrompts = {
        askLine: async (question) => {
            questions.push({ kind: "line", ...question })
            return lines.shift() ?? ""
        },
        askText: async (question) => {
            questions.push({ kind: "text", ...question })
            return texts.shift() ?? ""
        },
        askNumber: async (question) => {
            questions.push({ kind: "number", ...question })
            return numbers.shift()
        },
        askYesNo: async (question) => {
            questions.push({ kind: "yes-no", ...question })
            return true
        },
    }
    return { prompts, questions }
}

describe("askToolInput", () => {
    test("asks for a Markdown text in the editor, as message_send's body", async () => {
        const { prompts, questions } = createPrompts({ texts: ["Yes."] })

        const input = await askToolInput(
            getToolDefinition("message_send"),
            prompts,
        )

        expect(input).toEqual({ body: "Yes." })
        expect(questions).toEqual([
            {
                kind: "text",
                message: "body: The message, in Markdown.",
                isRequired: true,
            },
        ])
    })

    test("asks for a short text on its line, as a task's summary", async () => {
        const { prompts, questions } = createPrompts({ lines: ["Answered."] })
        const tool = getToolDefinition("task_mark-as-done")

        const input = await askToolInput(tool, prompts)

        expect(input).toEqual({ summary: "Answered." })
        expect(questions.map(({ kind }) => kind)).toEqual(["line"])
    })

    test("asks for whole numbers, leaving out an optional one left empty", async () => {
        const { prompts, questions } = createPrompts({
            numbers: [1, undefined],
        })

        const input = await askToolInput(
            getToolDefinition("ticket_show"),
            prompts,
        )

        expect(input).toEqual({ from: 1 })
        expect(questions).toMatchObject([
            { kind: "number", isRequired: true, isInteger: true, min: 1 },
            {
                kind: "number",
                message: expect.stringMatching(/^to \(optional\): /),
                isRequired: false,
            },
        ])
    })

    test("refuses an input it can't ask for", async () => {
        const { prompts } = createPrompts({})
        const tool = {
            name: "ticket_tag",
            description: "Tag the ticket.",
            inputSchema: { properties: { tags: { type: "array" } } },
        }

        const asking = askToolInput(tool, prompts)

        await expect(asking).rejects.toThrow(
            "ticket_tag takes a tags that is neither a text, a number nor a yes or no",
        )
    })
})
