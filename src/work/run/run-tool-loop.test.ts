import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { z } from "zod"
import { getAnthropicTools } from "../../llm/anthropic-messages/get-anthropic-tools.ts"
import { useFakeAnthropicServer } from "../../llm/anthropic-messages/use-fake-anthropic-server.testing.ts"
import { taskMarkAsDoneTool } from "../tool/built-in/task/mark-as-done.ts"
import { taskMarkAsFailedTool } from "../tool/built-in/task/mark-as-failed.ts"
import { defineTool } from "../tool/define-tool.ts"
import { exampleToolContext } from "../tool/example-tool-context.testing.ts"
import { getToolDefinitions } from "../tool/get-tool-definitions.ts"
import {
    maxToolCallsPerRun,
    type RunProgress,
    reminderText,
    runToolLoop,
} from "./run-tool-loop.ts"
import { loadRun } from "./storage.ts"

const fakeServer = useFakeAnthropicServer()
let projectRoot: string
let writtenNotes: string[]

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
    writtenNotes = []
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const runId = "20261018-140324-000-1b2c"

const noteWriteTool = defineTool({
    description: "Write a note.",
    inputSchema: z.strictObject({ text: z.string() }),
    execute: async ({ text }) => {
        writtenNotes.push(text)
        return { text: `Wrote "${text}".` }
    },
})

const tools = {
    note_write: noteWriteTool,
    "task_mark-as-done": taskMarkAsDoneTool,
    "task_mark-as-failed": taskMarkAsFailedTool,
}

const markAsDoneCall = {
    name: "task_mark-as-done",
    input: { summary: "Wrote the notes." },
}

function runFakeLoop(progresses: RunProgress[] = []) {
    return runToolLoop({
        ctx: { ...exampleToolContext, projectRoot, runId },
        connection: { baseUrl: fakeServer.getUrl() },
        apiKey: "sk-test",
        apiId: "claude-opus-5-5",
        systemPrompt: "You are Claude Senior.",
        userMessage: "Write two notes.",
        tools,
        onProgress: (progress) => progresses.push(progress),
    })
}

function getRequestTurns(requestIndex: number) {
    return fakeServer.requests[requestIndex]?.body.messages ?? []
}

describe("runToolLoop", () => {
    test("starts a fresh conversation: system prompt, tools, task's message", async () => {
        fakeServer.respondWith({ toolCalls: [markAsDoneCall] })

        await runFakeLoop()

        const body = fakeServer.requests[0]?.body
        const anthropicTools = getAnthropicTools(getToolDefinitions(tools))
        expect(body?.system[0]?.text).toBe("You are Claude Senior.")
        expect(body?.tools).toEqual(anthropicTools)
        expect(body?.messages).toMatchObject([
            {
                role: "user",
                content: [{ type: "text", text: "Write two notes." }],
            },
        ])
    })

    test("runs a turn's tool calls in their order, then gives their results", async () => {
        fakeServer.respondWith(
            {
                toolCalls: [
                    { name: "note_write", input: { text: "first" } },
                    { name: "note_write", input: { text: "second" } },
                ],
            },
            { toolCalls: [markAsDoneCall] },
        )

        await runFakeLoop()

        const toolResults = getRequestTurns(1).at(-1)?.content
        expect(writtenNotes).toEqual(["first", "second"])
        expect(toolResults).toMatchObject([
            { type: "tool_result", content: 'Wrote "first".' },
            { type: "tool_result", content: 'Wrote "second".' },
        ])
    })

    test("ends after the turn that marks the task as done, calling no model", async () => {
        fakeServer.respondWith({
            toolCalls: [
                { name: "note_write", input: { text: "first" } },
                markAsDoneCall,
            ],
        })

        const { taskEnding } = await runFakeLoop()

        expect(taskEnding).toEqual({
            state: "done",
            summary: "Wrote the notes.",
        })
        expect(fakeServer.requests).toHaveLength(1)
        expect(writtenNotes).toEqual(["first"])
    })

    test("ends after the turn that gives the task up", async () => {
        const reason = "There is nothing to note."
        fakeServer.respondWith({
            toolCalls: [{ name: "task_mark-as-failed", input: { reason } }],
        })

        const { taskEnding } = await runFakeLoop()

        expect(taskEnding).toEqual({ state: "failed", reason })
    })

    test("gives a refused call back as an error, and goes on", async () => {
        fakeServer.respondWith(
            { toolCalls: [{ name: "note_write", input: {} }] },
            { toolCalls: [markAsDoneCall] },
        )

        const { taskEnding } = await runFakeLoop()

        const [toolResult] = getRequestTurns(1).at(-1)?.content ?? []
        expect(toolResult?.is_error).toBe(true)
        expect(taskEnding.state).toBe("done")
    })

    test("sums the tokens of the run's requests", async () => {
        fakeServer.respondWith(
            { toolCalls: [{ name: "note_write", input: { text: "first" } }] },
            { toolCalls: [markAsDoneCall] },
        )

        const { usage } = await runFakeLoop()

        expect(usage).toEqual({
            inputTokens: 20,
            outputTokens: 10,
            cacheReadInputTokens: 200,
            cacheCreationInputTokens: 40,
        })
    })

    test("keeps the transcript in llmco's blocks, a line per turn", async () => {
        fakeServer.respondWith({ toolCalls: [markAsDoneCall] })

        await runFakeLoop()

        const { conversation } = await loadRun(projectRoot, runId)
        const modelResponse = { payload: { stop_reason: "tool_use" } }
        expect(conversation.systemPrompt).toBe("You are Claude Senior.")
        expect(conversation.turns).toMatchObject([
            { role: "user", blocks: [{ type: "text" }] },
            {
                role: "assistant",
                blocks: [{ type: "tool-call", name: "task_mark-as-done" }],
                modelResponse,
            },
            { role: "user", blocks: [{ type: "tool-result" }] },
        ])
    })
})

describe("runToolLoop after a turn without any tool call", () => {
    test("reminds the model to mark its task as done or failed", async () => {
        fakeServer.respondWith(
            { text: "I wrote the notes." },
            { toolCalls: [markAsDoneCall] },
        )
        const progresses: RunProgress[] = []

        const { taskEnding } = await runFakeLoop(progresses)

        const reminder = getRequestTurns(1).at(-1)
        const reminderProgress: RunProgress = {
            kind: "reminder",
            text: reminderText,
        }
        expect(reminder).toMatchObject({
            role: "user",
            content: [{ type: "text", text: reminderText }],
        })
        expect(progresses).toContainEqual(reminderProgress)
        expect(taskEnding.state).toBe("done")
    })

    test("fails the task after a second one", async () => {
        fakeServer.respondWith({ text: "Done." }, { text: "Done, really." })

        const { taskEnding } = await runFakeLoop()

        expect(taskEnding).toEqual({
            state: "failed",
            reason: "The model ended two turns without calling a tool, the second after a reminder.",
        })
        expect(fakeServer.requests).toHaveLength(2)
    })
})

describe("runToolLoop at its limits", () => {
    function createNoteWritings(count: number) {
        return Array.from({ length: count }, (_, index) => ({
            name: "note_write",
            input: { text: `note ${index}` },
        }))
    }

    test("fails the task rather than go beyond its tool calls", async () => {
        const firstToolCalls = createNoteWritings(maxToolCallsPerRun - 1)
        fakeServer.respondWith(
            { toolCalls: firstToolCalls },
            { toolCalls: createNoteWritings(2) },
        )

        const { taskEnding } = await runFakeLoop()

        const reason = `The run went beyond ${maxToolCallsPerRun} tool calls without ending its task.`
        expect(taskEnding).toEqual({ state: "failed", reason })
        expect(writtenNotes).toHaveLength(maxToolCallsPerRun - 1)
    })

    test.each([
        ["refusal", "The model's provider declined to go on (refusal)."],
        ["max_tokens", "The model's turn was cut at its maximum length."],
    ] as const)(
        "fails the task, running no tool, on a %s",
        async (stopReason, reason) => {
            fakeServer.respondWith({
                toolCalls: createNoteWritings(1),
                stopReason,
            })

            const { taskEnding } = await runFakeLoop()

            expect(taskEnding).toEqual({ state: "failed", reason })
            expect(writtenNotes).toEqual([])
        },
    )
})
