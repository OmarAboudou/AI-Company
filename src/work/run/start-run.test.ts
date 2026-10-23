import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { startRun } from "./start-run.ts"
import { loadRun } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "aico-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const runStart = {
    id: "20261018-140324-000-1b2c",
    systemPrompt: "You are Julie.",
    tools: [
        {
            name: "task_mark-as-done",
            description: "Mark your task as done.",
            inputSchema: { type: "object" },
        },
    ],
    userMessage: "Answer the last message of this thread.",
    session: {
        toolNames: ["message_send"],
        boundToolInputs: { message_send: { threadId: "2026-10-18-stack" } },
        result: { askedEntryId: "20261018-140322-123-3f9a" },
    },
}

describe("startRun", () => {
    test("gives the run its system prompt, its tools, then the task's message, keeping its session", async () => {
        const run = await startRun(projectRoot, runStart)

        expect(run).toEqual({
            id: runStart.id,
            conversation: {
                systemPrompt: "You are Julie.",
                tools: runStart.tools,
                turns: [
                    {
                        role: "user",
                        blocks: [
                            {
                                type: "text",
                                text: "Answer the last message of this thread.",
                            },
                        ],
                    },
                ],
            },
            session: runStart.session,
        })
    })

    test("writes the run's transcript, from which it can be read back", async () => {
        const startedRun = await startRun(projectRoot, runStart)

        expect(await loadRun(projectRoot, runStart.id)).toEqual(startedRun)
    })
})
