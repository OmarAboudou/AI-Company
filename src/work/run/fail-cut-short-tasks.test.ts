import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { recordEvent } from "../../journal/record-event.ts"
import { listEvents, loadJournal } from "../../journal/storage.ts"
import { createCompanyWithLlmEmployee } from "../create-company-with-llm-employee.testing.ts"
import { createExampleWorkCatalog } from "../create-example-work-catalog.testing.ts"
import { sendExampleMessage } from "../send-example-message.testing.ts"
import { getTaskStates } from "../task/get-task-states.ts"
import { type Task, taskStartedEventType } from "../task/schema.ts"
import { failCutShortTasks } from "./fail-cut-short-tasks.ts"
import { startRun } from "./start/start-run.ts"

let projectRoot: string
let task: Task

beforeEach(async () => {
    const company = await createCompanyWithLlmEmployee("http://localhost:1")
    projectRoot = company.projectRoot
    const { createdTasks } = await sendExampleMessage(
        projectRoot,
        company.ticketNumber,
        "Hono or Express?",
        createExampleWorkCatalog(["backend-developer"]),
    )
    const [createdTask] = createdTasks
    if (createdTask === undefined) {
        throw new Error("Asking the developer created no task")
    }
    task = createdTask
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const runId = "20261023-140324-000-1b2c"

type TaskStart = {
    processId?: number
    isWorkedByDirectors?: boolean
    hasTranscript?: boolean
}

async function startTask({
    processId,
    isWorkedByDirectors = false,
    hasTranscript = true,
}: TaskStart) {
    if (hasTranscript) {
        await startRun(projectRoot, {
            id: runId,
            ...(processId !== undefined && { processId }),
            systemPrompt: "You are Claude Senior.",
            tools: [],
            userMessage: "Answer the last message of ticket #1.",
            session: { toolNames: [], result: {} },
        })
    }
    await recordEvent(await loadJournal(projectRoot), taskStartedEventType, {
        depth: 1,
        taskId: task.id,
        runId,
        worker: isWorkedByDirectors
            ? { kind: "directors" }
            : { kind: "employee", employeeId: "claude" },
    })
}

function readStoppedProcessId(): number {
    return Bun.spawnSync(["true"]).pid
}

async function readTaskState() {
    const events = await listEvents(projectRoot)
    return getTaskStates([task], events).get(task.id)
}

describe("failCutShortTasks", () => {
    test("fails a model's task whose process stopped before ending it", async () => {
        await startTask({ processId: readStoppedProcessId() })

        const failedTasks = await failCutShortTasks(
            await loadJournal(projectRoot),
        )

        expect(failedTasks).toEqual([task])
        const events = await listEvents(projectRoot)
        expect(events.at(-1)).toMatchObject({
            type: "task-failed",
            depth: 1,
            taskId: task.id,
            runId,
            reason: "Its session was cut short: the process that ran it stopped before it ended.",
        })
    })

    test("leaves a model's task whose process still runs", async () => {
        await startTask({ processId: process.ppid })

        const failedTasks = await failCutShortTasks(
            await loadJournal(projectRoot),
        )

        expect(failedTasks).toEqual([])
        expect(await readTaskState()).toBe("running")
    })

    test("fails a task whose run names the calling process, an earlier one's id given again", async () => {
        await startTask({ processId: process.pid })

        const failedTasks = await failCutShortTasks(
            await loadJournal(projectRoot),
        )

        expect(failedTasks).toEqual([task])
    })

    test("leaves a task whose run another machine keeps", async () => {
        await startTask({ hasTranscript: false })

        const failedTasks = await failCutShortTasks(
            await loadJournal(projectRoot),
        )

        expect(failedTasks).toEqual([])
        expect(await readTaskState()).toBe("running")
    })

    test("leaves a person's task, which they resume later", async () => {
        await startTask({ isWorkedByDirectors: true })

        const failedTasks = await failCutShortTasks(
            await loadJournal(projectRoot),
        )

        expect(failedTasks).toEqual([])
        expect(await readTaskState()).toBe("running")
    })
})
