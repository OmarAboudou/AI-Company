import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Thread } from "./schema.ts"
import { listThreads, loadThread, saveThread } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const framework: Thread = {
    id: "2026-10-18-choice-of-framework",
    subject: "Choice of framework",
    createdAt: "2026-10-18T14:03:22.123Z",
    createdBy: {
        position: { id: "director", title: "Director" },
        committer: { name: "Omar Aboudou", email: "omar@example.com" },
    },
}

describe("saveThread and loadThread", () => {
    test("write thread.json and read it back", async () => {
        await saveThread(projectRoot, framework)

        const path = join(projectRoot, ".llmco", "threads", framework.id)
        const config = await Bun.file(join(path, "thread.json")).json()

        expect(config.subject).toBe("Choice of framework")
        expect(await loadThread(projectRoot, framework.id)).toEqual(framework)
    })
})

describe("listThreads", () => {
    test("is empty when no thread was ever created", async () => {
        expect(await listThreads(projectRoot)).toEqual([])
    })

    test("returns the threads sorted by id, so oldest first", async () => {
        const olderThread = { ...framework, id: "2026-10-17-budget" }
        await saveThread(projectRoot, framework)
        await saveThread(projectRoot, olderThread)

        expect(await listThreads(projectRoot)).toEqual([olderThread, framework])
    })
})
