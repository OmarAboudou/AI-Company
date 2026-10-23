import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { loadRun } from "../storage.ts"
import { startRun } from "./start-run.ts"

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
            name: "ticket_deliver",
            description: "Deliver this ticket once its request is met.",
            inputSchema: { type: "object" },
        },
    ],
    userMessage: "Answer the last message of this ticket.",
    session: {
        toolNames: ["ticket_ask"],
        boundToolInputs: { ticket_ask: { ticketNumber: 3 } },
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
                                text: "Answer the last message of this ticket.",
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
