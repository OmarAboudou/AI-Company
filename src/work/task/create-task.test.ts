import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { listEvents } from "../../journal/storage.ts"
import { createTask } from "./create-task.ts"
import { listTasks } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const developerTaskDefinition = {
    type: "catch-up-thread",
    params: { threadId: "2026-10-18-choice-of-framework" },
    positionId: "backend-developer",
    depth: 1,
    causeEventId: "20261018-140322-123-5d1e",
}

describe("createTask", () => {
    test("saves the task with the time it is created", async () => {
        const clockTime = Date.now()

        const task = await createTask(projectRoot, developerTaskDefinition)

        expect(task).toMatchObject(developerTaskDefinition)
        expect(Date.parse(task.createdAt)).toBeGreaterThanOrEqual(clockTime)
        expect(await listTasks(projectRoot)).toEqual([task])
    })

    test("records its creation in the journal, at its depth", async () => {
        const task = await createTask(projectRoot, developerTaskDefinition)

        expect(await listEvents(projectRoot)).toMatchObject([
            { type: "task-created", depth: 1, taskId: task.id },
        ])
    })
})
