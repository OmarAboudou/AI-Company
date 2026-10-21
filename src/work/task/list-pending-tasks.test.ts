import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { recordEvent } from "../../journal/record-event.ts"
import { messageSentEventType } from "../../messaging/message/schema.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.ts"
import { saveEmployee } from "../../organization/employee/storage.ts"
import { savePosition } from "../../organization/position/storage.ts"
import { createTask } from "./create-task.ts"
import { listPendingTasks } from "./list-pending-tasks.ts"
import { type Task, taskDoneEventType, taskStartedEventType } from "./schema.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    const claude = {
        id: "claude",
        name: "Claude Senior",
        kind: "llm",
        providerId: "anthropic",
        modelId: "opus",
    } as const
    const julie = { id: "julie", name: "Julie", kind: "human" } as const
    await Promise.all([
        saveEmployee(projectRoot, claude),
        saveEmployee(projectRoot, julie),
        ...[
            { id: "backend-developer", defaultEmployeeId: "claude" },
            { id: "support", defaultEmployeeId: "julie" },
            { id: "qa-tester" },
        ].map((position) =>
            savePosition(projectRoot, {
                title: position.id,
                description: "",
                ...position,
            }),
        ),
    ])
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function askPosition(
    positionId: string,
    type = "catch-up-thread",
): Promise<Task> {
    const threadId = "2026-10-18-choice-of-framework"
    const messageSentEvent = await recordEvent(
        projectRoot,
        messageSentEventType,
        {
            depth: 0,
            threadId,
            messageId: "20261018-140322-123-3f9a",
            mentions: [positionId],
        },
    )
    const uncreatedTask = { type, positionId, params: { threadId } }
    return createTask(projectRoot, uncreatedTask, messageSentEvent)
}

async function startTask(task: Task) {
    await recordEvent(projectRoot, taskStartedEventType, {
        depth: 1,
        taskId: task.id,
        runId: "20261018-140324-000-1b2c",
    })
}

describe("listPendingTasks", () => {
    test("lists as ready a task of a position an LLM employee works", async () => {
        const task = await askPosition("backend-developer")

        const pendingTasks = await listPendingTasks(projectRoot)

        expect(pendingTasks).toMatchObject([
            {
                kind: "ready",
                task,
                position: { id: "backend-developer" },
                employee: { id: "claude" },
            },
        ])
    })

    test("lists as waiting the tasks of positions no LLM works, saying why", async () => {
        for (const positionId of ["director", "support", "qa-tester", "ux"]) {
            await askPosition(positionId)
        }

        const pendingTasks = await listPendingTasks(projectRoot)

        const reasons = pendingTasks.map((pendingTask) =>
            pendingTask.kind === "waiting" ? pendingTask.reason : undefined,
        )
        expect(reasons).toEqual([
            "worked-by-directors",
            "worked-by-human",
            "vacant-position",
            "deleted-position",
        ])
    })

    test("lists as waiting a task of a type it doesn't know", async () => {
        await askPosition("backend-developer", "review-code")

        const pendingTasks = await listPendingTasks(projectRoot)

        expect(pendingTasks).toMatchObject([
            { kind: "waiting", reason: "unknown-type" },
        ])
    })

    test("lists a task left running, and not one that ended", async () => {
        const runningTask = await askPosition("backend-developer")
        const doneTask = await askPosition("backend-developer")
        await Promise.all([startTask(runningTask), startTask(doneTask)])
        await recordEvent(projectRoot, taskDoneEventType, {
            depth: 1,
            taskId: doneTask.id,
            summary: "Answered.",
        })

        const pendingTasks = await listPendingTasks(projectRoot)

        expect(pendingTasks).toMatchObject([{ task: runningTask }])
    })
})
