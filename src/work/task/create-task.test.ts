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

const developerNewTask = {
    type: "catch-up-thread",
    params: { threadId: "2026-10-18-choice-of-framework" },
    positionId: "backend-developer",
}

const answerSent = {
    id: "20261018-140351-000-8c2a",
    type: "message-sent",
    occurredAt: "2026-10-18T14:03:51.000Z",
    depth: 1,
}

describe("createTask", () => {
    test("saves the task, with the time it is created and its cause", async () => {
        const clockTime = Date.now()

        const task = await createTask(projectRoot, developerNewTask, answerSent)

        expect(task).toMatchObject({
            ...developerNewTask,
            causeEventId: answerSent.id,
        })
        expect(Date.parse(task.createdAt)).toBeGreaterThanOrEqual(clockTime)
        expect(await listTasks(projectRoot)).toEqual([task])
    })

    test("records its creation a step deeper than its cause", async () => {
        const task = await createTask(projectRoot, developerNewTask, answerSent)

        expect(await listEvents(projectRoot)).toMatchObject([
            { type: "task-created", depth: 2, taskId: task.id },
        ])
    })
})
