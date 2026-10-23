import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { AssistantTurn, UserTurn } from "../../llm/conversation/schema.ts"
import { UserError } from "../../user-error.ts"
import {
    appendRunTranscriptLine,
    loadRun,
    type NewRunTranscriptLine,
} from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "aico-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const runId = "20261018-140324-000-1b2c"

const runStart: NewRunTranscriptLine = {
    type: "start",
    apiId: "claude-opus-5-5",
    systemPrompt: "You are Claude Senior.",
    tools: [],
    session: { toolNames: [], result: {} },
}

const taskTurn: UserTurn = {
    role: "user",
    blocks: [{ type: "text", text: "Answer the ticket." }],
}

const answeringTurn: AssistantTurn = {
    role: "assistant",
    blocks: [{ type: "text", text: "Nothing to answer." }],
}

function getTranscriptPath(): string {
    return join(projectRoot, ".aico", ".state", "runs", `${runId}.jsonl`)
}

async function writeTranscript(lines: object[]): Promise<void> {
    const text = lines.map((line) => `${JSON.stringify(line)}\n`).join("")
    await Bun.write(getTranscriptPath(), text)
}

const writtenAt = "2026-10-18T14:03:24.000Z"

describe("appendRunTranscriptLine", () => {
    test("writes a JSON object per line in .aico/.state/runs/, with its time", async () => {
        const clockTime = Date.now()

        await appendRunTranscriptLine(projectRoot, runId, runStart)
        await appendRunTranscriptLine(projectRoot, runId, {
            type: "turn",
            ...taskTurn,
        })

        const transcriptText = await Bun.file(getTranscriptPath()).text()
        const lines = transcriptText
            .trimEnd()
            .split("\n")
            .map((line) => JSON.parse(line))
        const anyTime = { at: expect.any(String) }
        expect(lines).toEqual([
            { ...anyTime, ...runStart },
            { ...anyTime, type: "turn", ...taskTurn },
        ])
        expect(Date.parse(lines[0]?.at)).toBeGreaterThanOrEqual(clockTime)
    })
})

describe("loadRun", () => {
    test("reads a run back: what it was given, then its turns in order", async () => {
        await writeTranscript([
            { at: writtenAt, ...runStart },
            { at: writtenAt, type: "turn", ...taskTurn },
            { at: writtenAt, type: "turn", ...answeringTurn },
        ])

        const run = await loadRun(projectRoot, runId)

        expect(run).toEqual({
            id: runId,
            conversation: {
                systemPrompt: "You are Claude Senior.",
                tools: [],
                turns: [taskTurn, answeringTurn],
            },
            session: { toolNames: [], result: {} },
        })
    })

    test("refuses a line that isn't a transcript's, saying which", async () => {
        await writeTranscript([
            { at: writtenAt, ...runStart },
            { at: writtenAt, type: "turn", role: "user" },
        ])

        const loading = loadRun(projectRoot, runId)

        const refusalMessage = `Invalid .aico/.state/runs/${runId}.jsonl, line 2:`
        await expect(loading).rejects.toThrow(UserError)
        await expect(loading).rejects.toThrow(refusalMessage)
    })

    test("refuses a transcript that doesn't start with the run's start", async () => {
        await writeTranscript([{ at: writtenAt, type: "turn", ...taskTurn }])

        const loading = loadRun(projectRoot, runId)

        await expect(loading).rejects.toThrow("isn't the run's start")
    })
})
