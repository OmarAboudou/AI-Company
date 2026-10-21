import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Task } from "./schema.ts"
import { listTasks, saveTask } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const developerTask: Task = {
    id: "20261018-140323-000-77aa",
    askedAt: "2026-10-18T14:03:23.000Z",
    type: "catch-up-thread",
    params: { threadId: "2026-10-18-choice-of-framework" },
    positionId: "backend-developer",
    causeEventId: "20261018-140322-123-5d1e",
}

const testerTask: Task = {
    ...developerTask,
    id: "20261018-140323-001-0c4f",
    askedAt: "2026-10-18T14:03:23.001Z",
    positionId: "qa-tester",
}

describe("saveTask and listTasks", () => {
    test("write the task in .llmco/tasks/, then read it back", async () => {
        await saveTask(projectRoot, developerTask)

        const taskPath = join(
            projectRoot,
            ".llmco",
            "tasks",
            `${developerTask.id}.json`,
        )
        const { id, ...definition } = developerTask
        expect(await Bun.file(taskPath).json()).toEqual(definition)
        expect(await listTasks(projectRoot)).toEqual([developerTask])
    })

    test("list returns the tasks in the order they were created", async () => {
        await saveTask(projectRoot, testerTask)
        await saveTask(projectRoot, developerTask)

        expect(await listTasks(projectRoot)).toEqual([
            developerTask,
            testerTask,
        ])
    })

    test("save never overwrites a task", async () => {
        await saveTask(projectRoot, developerTask)
        const taskWithSameId = { ...testerTask, id: developerTask.id }

        const overwriting = saveTask(projectRoot, taskWithSameId)

        await expect(overwriting).rejects.toThrow("EEXIST")
        expect(await listTasks(projectRoot)).toEqual([developerTask])
    })
})
