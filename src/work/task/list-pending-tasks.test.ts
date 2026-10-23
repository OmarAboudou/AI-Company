import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { recordEvent } from "../../journal/record-event.ts"
import { loadJournal } from "../../journal/storage.ts"
import { messageSentEventType } from "../../messaging/message/schema.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { saveEmployee } from "../../organization/employee/storage.ts"
import { savePosition } from "../../organization/position/storage.ts"
import { UserError } from "../../user-error.ts"
import {
    createExampleWorkCatalog,
    exampleTaskType,
} from "../create-example-work-catalog.testing.ts"
import { pauseCompany } from "../pause/pause-company.ts"
import { createTask } from "./create-task.ts"
import { listPendingTasks } from "./list-pending-tasks.ts"
import { type Task, taskDoneEventType, taskStartedEventType } from "./schema.ts"

const { taskTypes } = createExampleWorkCatalog()
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
    await Promise.all([
        saveEmployee(projectRoot, claude),
        ...[
            { id: "backend-developer", employeeId: "claude" },
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
    type = exampleTaskType.type,
): Promise<Task> {
    const ticketNumber = 1
    const messageSentEvent = await recordEvent(
        await loadJournal(projectRoot),
        messageSentEventType,
        {
            depth: 0,
            ticketNumber,
            messageId: "20261018-140322-123-3f9a",
            positionId: "director",
        },
    )
    const uncreatedTask = { type, positionId, params: { ticketNumber } }
    return createTask(
        await loadJournal(projectRoot),
        uncreatedTask,
        messageSentEvent,
    )
}

async function startTask(task: Task) {
    await recordEvent(await loadJournal(projectRoot), taskStartedEventType, {
        depth: 1,
        taskId: task.id,
        runId: "20261018-140324-000-1b2c",
        worker: { kind: "employee", employeeId: "claude" },
    })
}

describe("listPendingTasks", () => {
    test("lists as ready a task of a position an LLM employee works", async () => {
        const task = await askPosition("backend-developer")

        const pendingTasks = await listPendingTasks(
            await loadJournal(projectRoot),
            taskTypes,
        )

        expect(pendingTasks).toMatchObject([
            {
                kind: "ready",
                task,
                position: { id: "backend-developer" },
                employee: { id: "claude" },
            },
        ])
    })

    test("lists as waiting the tasks of positions no LLM holds, saying why", async () => {
        for (const positionId of ["director", "qa-tester", "ux"]) {
            await askPosition(positionId)
        }

        const pendingTasks = await listPendingTasks(
            await loadJournal(projectRoot),
            taskTypes,
        )

        const reasons = pendingTasks.map((pendingTask) =>
            pendingTask.kind === "waiting" ? pendingTask.reason : undefined,
        )
        expect(reasons).toEqual([
            "worked-by-directors",
            "worked-by-directors",
            "deleted-position",
        ])
    })

    test("refuses a position naming an employee who doesn't exist", async () => {
        await savePosition(projectRoot, {
            id: "designer",
            title: "Designer",
            description: "",
            employeeId: "bob",
        })
        await askPosition("designer")
        const refusalMessage =
            'Position "designer" names employee "bob", who doesn\'t exist.'

        const listing = listPendingTasks(
            await loadJournal(projectRoot),
            taskTypes,
        )

        await expect(listing).rejects.toThrow(UserError)
        await expect(listing).rejects.toThrow(refusalMessage)
    })

    test("lists as waiting a task of a type it doesn't know", async () => {
        await askPosition("backend-developer", "review-code")

        const pendingTasks = await listPendingTasks(
            await loadJournal(projectRoot),
            taskTypes,
        )

        expect(pendingTasks).toMatchObject([
            { kind: "waiting", reason: "unknown-type" },
        ])
    })

    test("lists as waiting a task already running, and not one that ended", async () => {
        const runningTask = await askPosition("backend-developer")
        const doneTask = await askPosition("backend-developer")
        await Promise.all([startTask(runningTask), startTask(doneTask)])
        await recordEvent(await loadJournal(projectRoot), taskDoneEventType, {
            depth: 1,
            taskId: doneTask.id,
            runId: "20261018-150000-000-9e8d",
            hasPassedHand: false,
            result: {},
        })

        const pendingTasks = await listPendingTasks(
            await loadJournal(projectRoot),
            taskTypes,
        )

        expect(pendingTasks).toMatchObject([
            { kind: "waiting", task: runningTask, reason: "running" },
        ])
    })

    test("lists a model's queued task as waiting for the relaunch during a pause", async () => {
        const queuedTask = await askPosition("backend-developer")
        const runningTask = await askPosition("backend-developer")
        const directorTask = await askPosition("director")
        await startTask(runningTask)
        await pauseCompany(await loadJournal(projectRoot))

        const pendingTasks = await listPendingTasks(
            await loadJournal(projectRoot),
            taskTypes,
        )

        expect(pendingTasks).toMatchObject([
            { kind: "waiting", task: queuedTask, reason: "paused" },
            { kind: "waiting", task: runningTask, reason: "running" },
            {
                kind: "waiting",
                task: directorTask,
                reason: "worked-by-directors",
            },
        ])
    })
})
