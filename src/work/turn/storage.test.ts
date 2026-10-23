import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { StagedTurn } from "./schema.ts"
import { deleteStagedTurn, loadStagedTurn, saveStagedTurn } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "aico-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const runId = "20261018-140324-000-1b2c"

const stagedTurn: StagedTurn = {
    blocks: [
        { type: "text", text: "Answering." },
        {
            type: "tool-call",
            id: "call_8f3a2b1c9d0e",
            name: "message_send",
            input: { body: "@director Yes." },
        },
    ],
}

describe("saveStagedTurn and loadStagedTurn", () => {
    test("keep a run's next turn next to its transcript, out of git", async () => {
        await saveStagedTurn(projectRoot, runId, stagedTurn)

        const path = join(
            projectRoot,
            ".aico",
            ".state",
            "runs",
            `${runId}.turn.json`,
        )
        const gitignorePath = join(projectRoot, ".aico", ".state", ".gitignore")
        expect(await Bun.file(path).json()).toEqual(stagedTurn)
        expect(await Bun.file(gitignorePath).exists()).toBe(true)
        expect(await loadStagedTurn(projectRoot, runId)).toEqual(stagedTurn)
    })

    test("load an empty turn when none was added to", async () => {
        expect(await loadStagedTurn(projectRoot, runId)).toEqual({ blocks: [] })
    })
})

describe("deleteStagedTurn", () => {
    test("empties the run's next turn, even when there is none", async () => {
        await saveStagedTurn(projectRoot, runId, stagedTurn)

        await deleteStagedTurn(projectRoot, runId)
        await deleteStagedTurn(projectRoot, runId)

        expect(await loadStagedTurn(projectRoot, runId)).toEqual({ blocks: [] })
    })
})
