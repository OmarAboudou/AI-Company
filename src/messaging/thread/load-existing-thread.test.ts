import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { loadExistingThread } from "./load-existing-thread.ts"
import type { Thread } from "./schema.ts"
import { saveThread } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("loadExistingThread", () => {
    test("loads the thread the id names", async () => {
        const thread: Thread = {
            id: "2026-10-18-budget",
            subject: "Budget",
            createdAt: "2026-10-18T14:03:22.123Z",
            createdBy: {
                position: { id: "director", title: "Director" },
                committer: { name: "Omar Aboudou", email: "omar@example.com" },
            },
        }
        await saveThread(projectRoot, thread)

        const loadedThread = await loadExistingThread(projectRoot, thread.id)

        expect(loadedThread).toEqual(thread)
    })

    test("refuses an unknown thread, saying how to list them", async () => {
        const refusalMessage =
            'No thread "2026-10-18-budget". Run `aico thread list`.'

        const loading = loadExistingThread(projectRoot, "2026-10-18-budget")

        await expect(loading).rejects.toThrow(UserError)
        await expect(loading).rejects.toThrow(refusalMessage)
    })

    test("refuses an id that is not kebab-case", async () => {
        const loading = loadExistingThread(projectRoot, "Budget")

        await expect(loading).rejects.toThrow('Invalid thread id "Budget"')
    })
})
