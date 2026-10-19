import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { newThreadId } from "./create-thread-id.ts"
import type { Thread } from "./schema.ts"
import { saveThread, threadExists } from "./storage.ts"

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

describe("newThreadId", () => {
    test("starts with the creation date", async () => {
        const id = await newThreadId(
            projectRoot,
            "Choice of framework",
            framework.createdAt,
        )

        expect(id).toBe("2026-10-18-choice-of-framework")
    })

    test("adds a number when the id is taken", async () => {
        await saveThread(projectRoot, framework)
        const exists = await threadExists(projectRoot, framework.id)

        const id = await newThreadId(
            projectRoot,
            "Choice of framework",
            framework.createdAt,
        )

        expect(exists).toBe(true)
        expect(id).toBe("2026-10-18-choice-of-framework-2")
    })
})
