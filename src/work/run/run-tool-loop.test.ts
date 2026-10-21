import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { z } from "zod"
import { useFakeAnthropicServer } from "../../llm/anthropic-messages/use-fake-anthropic-server.ts"
import { taskCompleteTool } from "../tool/built-in/task/complete.ts"
import { taskFailTool } from "../tool/built-in/task/fail.ts"
import { defineTool, type ToolContext } from "../tool/define-tool.ts"
import { getAnthropicTools } from "./get-anthropic-tools.ts"
import {
    maxToolCallsPerRun,
    type RunProgress,
    reminderText,
    runToolLoop,
} from "./run-tool-loop.ts"
import { listRunTranscriptLines } from "./storage.ts"

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
    task_complete: taskCompleteTool,
    task_fail: taskFailTool,
}

const completion = {
    name: "task_complete",
    input: { summary: "Wrote the notes." },
}

function runFakeLoop(progresses: RunProgress[] = []) {
    const ctx: ToolContext = {
        projectRoot,
        task: {
            id: "20261018-140323-000-77aa",
            createdAt: "2026-10-18T14:03:23.000Z",
            type: "catch-up-thread",
            params: { threadId: "2026-10-18-choice-of-framework" },
            positionId: "backend-developer",
            causeEventId: "20261018-140322-123-5d1e",
        },
        runId,
    }
    return runToolLoop({
        ctx,
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
        fakeServer.respondWith({ toolCalls: [completion] })

        await runFakeLoop()

        const body = fakeServer.requests[0]?.body
        expect(body?.system[0]?.text).toBe("You are Claude Senior.")
        expect(body?.tools).toEqual(getAnthropicTools(tools))
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
            { toolCalls: [completion] },
        )

        await runFakeLoop()

        const toolResults = getRequestTurns(1).at(-1)?.content
        expect(writtenNotes).toEqual(["first", "second"])
        expect(toolResults).toMatchObject([
            { type: "tool_result", content: 'Wrote "first".' },
            { type: "tool_result", content: 'Wrote "second".' },
        ])
    })

    test("ends after the turn that completes the task, calling no model", async () => {
        fakeServer.respondWith({
            toolCalls: [
                { name: "note_write", input: { text: "first" } },
                completion,
            ],
        })

        const { taskEnding } = await runFakeLoop()

        expect(taskEnding).toEqual({
            state: "succeeded",
            summary: "Wrote the notes.",
        })
        expect(fakeServer.requests).toHaveLength(1)
        expect(writtenNotes).toEqual(["first"])
    })

    test("ends after the turn that gives the task up", async () => {
        const reason = "There is nothing to note."
        fakeServer.respondWith({
            toolCalls: [{ name: "task_fail", input: { reason } }],
        })

        const { taskEnding } = await runFakeLoop()

        expect(taskEnding).toEqual({ state: "failed", reason })
    })

    test("gives a refused call back as an error, and goes on", async () => {
        fakeServer.respondWith(
            { toolCalls: [{ name: "note_write", input: {} }] },
            { toolCalls: [completion] },
        )

        const { taskEnding } = await runFakeLoop()

        const [toolResult] = getRequestTurns(1).at(-1)?.content ?? []
        expect(toolResult?.is_error).toBe(true)
        expect(taskEnding.state).toBe("succeeded")
    })

    test("sums the tokens of the run's requests", async () => {
        fakeServer.respondWith(
            { toolCalls: [{ name: "note_write", input: { text: "first" } }] },
            { toolCalls: [completion] },
        )

        const { usage } = await runFakeLoop()

        expect(usage).toEqual({
            inputTokens: 20,
            outputTokens: 10,
            cacheReadInputTokens: 200,
            cacheCreationInputTokens: 40,
        })
    })

    test("keeps the transcript, line by line", async () => {
        fakeServer.respondWith({ toolCalls: [completion] })

        await runFakeLoop()

        const lines = await listRunTranscriptLines(projectRoot, runId)
        expect(lines).toMatchObject([
            { type: "start", systemPrompt: "You are Claude Senior." },
            { type: "user", content: [{ text: "Write two notes." }] },
            { type: "assistant", message: { stop_reason: "tool_use" } },
            { type: "user", content: [{ type: "tool_result" }] },
        ])
    })
})

describe("runToolLoop after a turn without any tool call", () => {
    test("reminds the model to complete or fail its task", async () => {
        fakeServer.respondWith(
            { text: "I wrote the notes." },
            { toolCalls: [completion] },
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
        expect(taskEnding.state).toBe("succeeded")
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
