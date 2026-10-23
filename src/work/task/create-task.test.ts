import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { listEvents, loadJournal } from "../../journal/storage.ts"
import { createTask } from "./create-task.ts"
import { createTaskId } from "./create-task-id.ts"
import { listTasks } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "aico-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const developerNewTask = {
    type: "example",
    params: { threadId: "2026-10-18-choice-of-framework" },
    positionId: "backend-developer",
}

const answerSent = {
    id: "20261018-140351-000-8c2a",
    type: "message-sent",
    occurredAt: "2026-10-18T14:03:51.000Z",
    depth: 1,
}

async function readTaskFile(root: string, taskId: string): Promise<string> {
    return Bun.file(join(root, ".aico", "tasks", `${taskId}.json`)).text()
}

describe("createTask", () => {
    test("saves the task under the id of what it is, asked when its cause happened", async () => {
        const task = await createTask(
            await loadJournal(projectRoot),
            developerNewTask,
            answerSent,
        )

        expect(task).toEqual({
            id: createTaskId(answerSent.id, developerNewTask),
            askedAt: answerSent.occurredAt,
            ...developerNewTask,
            causeEventId: answerSent.id,
        })
        expect(await listTasks(projectRoot)).toEqual([task])
    })

    test("writes the same file for the same task, wherever it is created", async () => {
        const otherProjectRoot = await mkdtemp(join(tmpdir(), "aico-"))
        const reorderedTask = {
            positionId: developerNewTask.positionId,
            params: developerNewTask.params,
            type: developerNewTask.type,
        }

        const task = await createTask(
            await loadJournal(projectRoot),
            developerNewTask,
            answerSent,
        )
        await createTask(
            await loadJournal(otherProjectRoot),
            reorderedTask,
            answerSent,
        )

        const [taskText, otherTaskText] = await Promise.all([
            readTaskFile(projectRoot, task.id),
            readTaskFile(otherProjectRoot, task.id),
        ])
        await rm(otherProjectRoot, { recursive: true, force: true })
        expect(otherTaskText).toBe(taskText)
    })

    test("records its creation a step deeper than its cause", async () => {
        const task = await createTask(
            await loadJournal(projectRoot),
            developerNewTask,
            answerSent,
        )

        expect(await listEvents(projectRoot)).toMatchObject([
            { type: "task-created", depth: 2, taskId: task.id },
        ])
    })
})
