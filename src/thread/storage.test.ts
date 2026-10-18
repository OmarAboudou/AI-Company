import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
    listThreads,
    loadThread,
    newThreadId,
    saveThread,
    slugify,
    threadExists,
} from "./storage.ts"
import type { Thread } from "./thread.ts"

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
        employee: { id: "omar", name: "Omar Aboudou" },
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
        const older = { ...framework, id: "2026-10-17-budget" }
        await saveThread(projectRoot, framework)
        await saveThread(projectRoot, older)

        expect(await listThreads(projectRoot)).toEqual([older, framework])
    })
})

describe("slugify", () => {
    test.each([
        ["Choice of framework", "choice-of-framework"],
        [
            "Choix du framework : Hono ou Express ?",
            "choix-du-framework-hono-ou-express",
        ],
        ["Économie & café", "economie-cafe"],
        ["  API v2  ", "api-v2"],
        ["!!!", "thread"],
        ["予算", "thread"],
    ])("%s becomes %s", (subject, slug) => {
        expect(slugify(subject)).toBe(slug)
    })

    test("keeps whole words within 50 characters", () => {
        const subject = "word ".repeat(20)

        const slug = slugify(subject)

        expect(slug.length).toBeLessThanOrEqual(50)
        expect(slug).toMatch(/^word(-word)*$/)
    })
})

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
