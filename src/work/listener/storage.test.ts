import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { loadDispatchedEventIds, saveDispatchedEventIds } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const questionSentId = "20261018-140322-123-5d1e"
const answerSentId = "20261018-140351-000-8c2a"

describe("saveDispatchedEventIds and loadDispatchedEventIds", () => {
    test("write the ids in .llmco/.state/, oldest first, then read them", async () => {
        const eventIds = new Set([answerSentId, questionSentId])

        await saveDispatchedEventIds(projectRoot, eventIds)

        const statePath = join(
            projectRoot,
            ".llmco",
            ".state",
            "dispatched-events.json",
        )
        expect(await Bun.file(statePath).json()).toEqual({
            eventIds: [questionSentId, answerSentId],
        })
        expect(await loadDispatchedEventIds(projectRoot)).toEqual(eventIds)
    })

    test("load gives no id before the first dispatching", async () => {
        expect(await loadDispatchedEventIds(projectRoot)).toEqual(new Set())
    })
})
