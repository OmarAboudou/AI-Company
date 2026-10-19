import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createThreadId } from "./create-thread-id.ts"
import type { Thread } from "./schema.ts"
import { hasThread, saveThread } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const thread: Thread = {
    id: "2026-10-18-choice-of-framework",
    subject: "Choice of framework",
    createdAt: "2026-10-18T14:03:22.123Z",
    createdBy: {
        position: { id: "director", title: "Director" },
        committer: { name: "Omar Aboudou", email: "omar@example.com" },
    },
}

describe("createThreadId", () => {
    test("starts with the creation date", async () => {
        const createdId = await createThreadId(
            projectRoot,
            "Choice of framework",
            thread.createdAt,
        )

        expect(createdId).toBe("2026-10-18-choice-of-framework")
    })

    test("adds a number when the id is taken", async () => {
        await saveThread(projectRoot, thread)
        const isIdTaken = await hasThread(projectRoot, thread.id)

        const createdId = await createThreadId(
            projectRoot,
            "Choice of framework",
            thread.createdAt,
        )

        expect(isIdTaken).toBe(true)
        expect(createdId).toBe("2026-10-18-choice-of-framework-2")
    })
})
