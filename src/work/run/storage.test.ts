import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
    appendRunTranscriptLine,
    listRunTranscriptLines,
    type RunTranscriptLine,
} from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const runId = "20261018-140324-000-1b2c"

describe("appendRunTranscriptLine and listRunTranscriptLines", () => {
    test("write a run's lines in .llmco/.state/runs/, then read them", async () => {
        const clockTime = Date.now()
        const blocks = [{ type: "text" as const, text: "Catch up." }]

        await appendRunTranscriptLine(projectRoot, runId, {
            type: "turn",
            role: "user",
            blocks,
        })

        const transcriptPath = join(
            projectRoot,
            ".llmco",
            ".state",
            "runs",
            `${runId}.jsonl`,
        )
        const [line] = (await listRunTranscriptLines(
            projectRoot,
            runId,
        )) as RunTranscriptLine[]
        const transcriptText = await Bun.file(transcriptPath).text()
        expect(line).toEqual({
            at: expect.any(String),
            type: "turn",
            role: "user",
            blocks,
        })
        expect(Date.parse(line?.at ?? "")).toBeGreaterThanOrEqual(clockTime)
        expect(transcriptText).toBe(`${JSON.stringify(line)}\n`)
    })
})
