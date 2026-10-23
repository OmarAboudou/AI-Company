import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { z } from "zod"
import { getAnthropicTools } from "../../llm/anthropic-messages/get-anthropic-tools.ts"
import { useFakeAnthropicServer } from "../../llm/anthropic-messages/use-fake-anthropic-server.testing.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { taskMarkAsDoneTool } from "../tool/built-in/task/mark-as-done.ts"
import { taskMarkAsFailedTool } from "../tool/built-in/task/mark-as-failed.ts"
import { defineTool } from "../tool/define-tool.ts"
import { exampleToolContext } from "../tool/example-tool-context.testing.ts"
import { getToolDefinitions } from "../tool/get-tool-definitions.ts"
import { runToolLoop } from "./run-tool-loop.ts"
import type { RunProgress } from "./schema.ts"
import { startRun } from "./start/start-run.ts"
import { loadRun } from "./storage.ts"

const fakeServer = useFakeAnthropicServer()
let projectRoot: string
let writtenNotes: string[]

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
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

const noteHandOverTool = defineTool({
    description: "Hand the notes over, passing the hand.",
    inputSchema: z.strictObject({}),
    execute: async () => ({ text: "Handed over.", hasPassedHand: true }),
})

const tools = {
    note_write: noteWriteTool,
    "note_hand-over": noteHandOverTool,
    "task_mark-as-done": taskMarkAsDoneTool,
    "task_mark-as-failed": taskMarkAsFailedTool,
}

const markAsDoneCall = {
    name: "task_mark-as-done",
    input: { summary: "Wrote the notes." },
}

async function runFakeLoop(
    progresses: RunProgress[] = [],
    loadCancellationReason?: () => Promise<string | undefined>,
) {
    const run = await startRun(projectRoot, {
        id: runId,
        apiId: "claude-opus-5-5",
        systemPrompt: "You are Claude Senior.",
        tools: getToolDefinitions(tools),
        userMessage: "Write two notes.",
        session: { toolNames: ["note_write"], result: {} },
    })
    return runToolLoop({
        run,
        ctx: { ...exampleToolContext, projectRoot, runId },
        connection: { baseUrl: fakeServer.getUrl() },
        apiKey: "sk-test",
        apiId: "claude-opus-5-5",
        tools,
        onProgress: (progress) => progresses.push(progress),
        loadCancellationReason,
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

    test("gives the model its calls' results, errors marked, in the next request", async () => {
        fakeServer.respondWith(
            {
                toolCalls: [
                    { name: "note_write", input: { text: "first" } },
                    { name: "note_write", input: {} },
                ],
            },
            { toolCalls: [markAsDoneCall] },
        )

        await runFakeLoop()

        const toolResults = getRequestTurns(1).at(-1)?.content
        expect(writtenNotes).toEqual(["first"])
        expect(toolResults).toMatchObject([
            { type: "tool_result", content: 'Wrote "first".' },
            { type: "tool_result", is_error: true },
        ])
    })

    test("ends at a turn without any tool call, calling no model again", async () => {
        fakeServer.respondWith({ text: "I wrote the notes." })

        const { taskEnding } = await runFakeLoop()

        expect(fakeServer.requests).toHaveLength(1)
        expect(taskEnding).toEqual({ state: "done", hasPassedHand: false })
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
            hasPassedHand: false,
            summary: "Wrote the notes.",
        })
        expect(fakeServer.requests).toHaveLength(1)
        expect(writtenNotes).toEqual(["first"])
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

    test("keeps each of the model's turns in the transcript, with its response", async () => {
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

    test.each([
        ["refusal", "The model's provider declined to go on (refusal)."],
        ["max_tokens", "The model's turn was cut at its maximum length."],
    ] as const)(
        "fails the task, running no tool, on a %s",
        async (stopReason, reason) => {
            fakeServer.respondWith({
                toolCalls: [{ name: "note_write", input: { text: "first" } }],
                stopReason,
            })

            const { taskEnding } = await runFakeLoop()

            expect(taskEnding).toEqual({ state: "failed", reason })
            expect(writtenNotes).toEqual([])
        },
    )

    test("ends the session at a call that passes the hand, running no call after it", async () => {
        fakeServer.respondWith({
            toolCalls: [
                { name: "note_hand-over", input: {} },
                { name: "note_write", input: { text: "late" } },
            ],
        })

        const { taskEnding } = await runFakeLoop()

        const run = await loadRun(projectRoot, runId)
        const lastResult = run.conversation.turns.at(-1)?.blocks.at(-1)
        expect(fakeServer.requests).toHaveLength(1)
        expect(taskEnding).toEqual({ state: "done", hasPassedHand: true })
        expect(writtenNotes).toEqual([])
        expect(lastResult).toMatchObject({
            text: "Not run: you passed the hand with note_hand-over, which ended your session.",
            isError: true,
        })
    })

    test("stops before calling the model again once the task became pointless", async () => {
        fakeServer.respondWith({
            toolCalls: [{ name: "note_write", input: { text: "first" } }],
        })
        const loadCancellationReason = async () =>
            writtenNotes.length > 0 ? "No more notes needed." : undefined

        const { taskEnding } = await runFakeLoop([], loadCancellationReason)

        expect(fakeServer.requests).toHaveLength(1)
        expect(taskEnding).toEqual({
            state: "cancelled",
            reason: "No more notes needed.",
        })
    })
})
