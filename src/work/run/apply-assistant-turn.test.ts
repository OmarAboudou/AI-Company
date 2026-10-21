import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { z } from "zod"
import type {
    AssistantTurn,
    ToolCallBlock,
    TurnStop,
} from "../../llm/conversation/schema.ts"
import { taskMarkAsDoneTool } from "../tool/built-in/task/mark-as-done.ts"
import { taskMarkAsFailedTool } from "../tool/built-in/task/mark-as-failed.ts"
import { defineTool } from "../tool/define-tool.ts"
import { exampleToolContext } from "../tool/example-tool-context.testing.ts"
import { getToolDefinitions } from "../tool/get-tool-definitions.ts"
import {
    applyAssistantTurn,
    maxToolCallsPerRun,
    reminderText,
} from "./apply-assistant-turn.ts"
import type { Run, RunProgress } from "./schema.ts"
import { startRun } from "./start-run.ts"
import { loadRun } from "./storage.ts"

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

let projectRoot: string
let writtenNotes: string[]
let startedRun: Run

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
    writtenNotes = []
    startedRun = await startRun(projectRoot, {
        id: runId,
        systemPrompt: "You are Julie.",
        tools: getToolDefinitions(tools),
        userMessage: "Write two notes.",
    })
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function createNoteWritings(count: number): ToolCallBlock[] {
    return Array.from({ length: count }, (_, index) => ({
        type: "tool-call",
        id: `call_${index}`,
        name: "note_write",
        input: { text: `note ${index}` },
    }))
}

const markAsDoneCall: ToolCallBlock = {
    type: "tool-call",
    id: "call_done",
    name: "task_mark-as-done",
    input: { summary: "Wrote the notes." },
}

function createTurn(...blocks: AssistantTurn["blocks"]): AssistantTurn {
    return { role: "assistant", blocks }
}

const textTurn = createTurn({ type: "text", text: "I wrote the notes." })

function applyFakeTurn(
    run: Run,
    turn: AssistantTurn,
    progresses: RunProgress[] = [],
) {
    return applyAssistantTurn(run, turn, {
        tools,
        ctx: { ...exampleToolContext, projectRoot, runId },
        onProgress: (progress) => progresses.push(progress),
    })
}

describe("applyAssistantTurn", () => {
    test("runs the turn's tool calls in their order, then gives their results back", async () => {
        const turn = createTurn(...createNoteWritings(2))

        const { run, taskEnding } = await applyFakeTurn(startedRun, turn)

        expect(writtenNotes).toEqual(["note 0", "note 1"])
        expect(run.conversation.turns.slice(1)).toEqual([
            turn,
            {
                role: "user",
                blocks: [
                    {
                        type: "tool-result",
                        toolCallId: "call_0",
                        text: 'Wrote "note 0".',
                        isError: false,
                    },
                    {
                        type: "tool-result",
                        toolCallId: "call_1",
                        text: 'Wrote "note 1".',
                        isError: false,
                    },
                ],
            },
        ])
        expect(taskEnding).toBeUndefined()
    })

    test("ends the task with the turn's first ending, once all its calls have run", async () => {
        const turn = createTurn(markAsDoneCall, ...createNoteWritings(1))

        const { taskEnding } = await applyFakeTurn(startedRun, turn)

        expect(writtenNotes).toEqual(["note 0"])
        expect(taskEnding).toEqual({
            state: "done",
            summary: "Wrote the notes.",
        })
    })

    test("reports each call and its result as it runs", async () => {
        const progresses: RunProgress[] = []
        const turn = createTurn(markAsDoneCall)

        await applyFakeTurn(startedRun, turn, progresses)

        expect(progresses).toEqual([
            {
                kind: "tool-call",
                name: "task_mark-as-done",
                input: { summary: "Wrote the notes." },
            },
            {
                kind: "tool-result",
                name: "task_mark-as-done",
                text: "Task marked as done.",
                isError: false,
            },
        ])
    })

    test("keeps the turn and its answer in the run's transcript", async () => {
        const turn = createTurn(...createNoteWritings(1))

        const { run } = await applyFakeTurn(startedRun, turn)

        expect(await loadRun(projectRoot, runId)).toEqual(run)
    })
})

describe("applyAssistantTurn after a turn without any tool call", () => {
    test("reminds whoever works the task to mark it as done or failed", async () => {
        const progresses: RunProgress[] = []

        const { run, taskEnding } = await applyFakeTurn(
            startedRun,
            textTurn,
            progresses,
        )

        const reminderTurn = run.conversation.turns.at(-1)
        expect(reminderTurn).toEqual({
            role: "user",
            blocks: [{ type: "text", text: reminderText }],
        })
        expect(progresses).toEqual([{ kind: "reminder", text: reminderText }])
        expect(taskEnding).toBeUndefined()
    })

    test("fails the task after a second one", async () => {
        const { run } = await applyFakeTurn(startedRun, textTurn)

        const { taskEnding } = await applyFakeTurn(run, textTurn)

        expect(taskEnding).toEqual({
            state: "failed",
            reason: "Two turns ended without calling a tool, the second after a reminder.",
        })
    })
})

describe("applyAssistantTurn at the run's limits", () => {
    test("fails the task rather than go beyond the run's tool calls", async () => {
        const firstCount = maxToolCallsPerRun - 1
        const firstTurn = createTurn(...createNoteWritings(firstCount))
        const { run } = await applyFakeTurn(startedRun, firstTurn)

        const secondTurn = createTurn(...createNoteWritings(2))
        const { taskEnding } = await applyFakeTurn(run, secondTurn)

        const reason = `The run went beyond ${maxToolCallsPerRun} tool calls without ending its task.`
        expect(taskEnding).toEqual({ state: "failed", reason })
        expect(writtenNotes).toHaveLength(firstCount)
    })

    const stopFailures: [string, TurnStop, string][] = [
        [
            "a refusal",
            { reason: "refusal", category: "cyber" },
            "The model's provider declined to go on (refusal, cyber).",
        ],
        [
            "a cut at its maximum length",
            { reason: "max-length" },
            "The model's turn was cut at its maximum length.",
        ],
        [
            "a conversation beyond its context window",
            { reason: "context-window-exceeded" },
            "The run's conversation outgrew the model's context window.",
        ],
    ]

    test.each(stopFailures)(
        "fails the task, running none of its calls, on %s",
        async (_, stop, reason) => {
            const usage = {
                inputTokens: 10,
                outputTokens: 5,
                cacheReadInputTokens: 0,
                cacheCreationInputTokens: 0,
            }
            const turn: AssistantTurn = {
                ...createTurn(...createNoteWritings(1)),
                modelResponse: {
                    protocol: "anthropic-messages",
                    payload: {},
                    usage,
                    stop,
                },
            }

            const { taskEnding } = await applyFakeTurn(startedRun, turn)

            expect(taskEnding).toEqual({ state: "failed", reason })
            expect(writtenNotes).toEqual([])
        },
    )
})
