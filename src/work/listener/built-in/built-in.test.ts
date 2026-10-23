import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { recordEvent } from "../../../journal/record-event.ts"
import { loadJournal } from "../../../journal/storage.ts"
import type { Author } from "../../../messaging/message/schema.ts"
import { actOnTicket } from "../../../messaging/ticket/act/act-on-ticket.ts"
import type { TicketActName } from "../../../messaging/ticket/act/ticket-acts.ts"
import { createExampleTicket } from "../../../messaging/ticket/create-example-ticket.testing.ts"
import { createTemporaryCompany } from "../../../organization/company/create-temporary-company.testing.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { pauseCompany } from "../../pause/pause-company.ts"
import { relaunchCompany } from "../../pause/relaunch-company.ts"
import { getTaskStates } from "../../task/get-task-states.ts"
import {
    type Task,
    taskDoneEventType,
    taskFailedEventType,
    taskStartedEventType,
} from "../../task/schema.ts"
import { listTasks } from "../../task/storage.ts"
import { builtInWorkCatalog } from "../../work-catalog.ts"
import { dispatchEvents } from "../dispatch-events.ts"

const committer = { name: "Test User", email: "test@example.com" }
const director: Author = {
    position: { id: "director", title: "Director" },
    committer,
}
const developer: Author = {
    position: { id: "developer", title: "Developer" },
    committer,
}

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await createPosition(projectRoot, "developer", {
        title: "Developer",
        description: "",
    })
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function dispatch() {
    return dispatchEvents(await loadJournal(projectRoot), builtInWorkCatalog)
}

async function findTaskOf(positionId: string, state: string) {
    const [tasks, journal] = await Promise.all([
        listTasks(projectRoot),
        loadJournal(projectRoot),
    ])
    const taskStates = getTaskStates(tasks, journal.events)
    return tasks.find(
        (task) =>
            task.positionId === positionId && taskStates.get(task.id) === state,
    )
}

// The position's session ends in its running task, as the run would end it.
async function endSessionOf(positionId: string, hasPassedHand = false) {
    await startQueuedTaskOf(positionId)
    const runningTask = await findTaskOf(positionId, "running")
    await recordEvent(await loadJournal(projectRoot), taskDoneEventType, {
        depth: 1,
        taskId: runningTask?.id ?? "",
        runId: "20261023-150000-000-9e8d",
        hasPassedHand,
        result: {},
    })
    return dispatch()
}

async function startQueuedTaskOf(positionId: string) {
    const [tasks, journal] = await Promise.all([
        listTasks(projectRoot),
        loadJournal(projectRoot),
    ])
    const taskStates = getTaskStates(tasks, journal.events)
    const queuedTask = tasks.find(
        (task) =>
            task.positionId === positionId &&
            taskStates.get(task.id) === "queued",
    )
    if (queuedTask !== undefined) {
        await recordEvent(journal, taskStartedEventType, {
            depth: 1,
            taskId: queuedTask.id,
            runId: "20261023-150000-000-9e8d",
            worker: { kind: "directors" },
        })
    }
}

async function failTaskOf(positionId: string) {
    await startQueuedTaskOf(positionId)
    const runningTask = await findTaskOf(positionId, "running")
    await recordEvent(await loadJournal(projectRoot), taskFailedEventType, {
        depth: 1,
        taskId: runningTask?.id ?? "",
        runId: "20261023-150000-000-9e8d",
        reason: "The model's turn was cut at its maximum length.",
    })
    return dispatch()
}

async function relaunch() {
    await relaunchCompany(await loadJournal(projectRoot))
    return dispatch()
}

// Each act happens in a session of its position, the task it was given.
async function act(actName: TicketActName, author: Author) {
    await startQueuedTaskOf(author.position.id)
    const journal = await loadJournal(projectRoot)
    await actOnTicket(
        journal,
        actName,
        author,
        { ticketNumber: 1, body: "Noted." },
        { depth: 0 },
    )
    return dispatch()
}

async function createDeveloperTicket() {
    await createExampleTicket(projectRoot, {
        rawAssigneePositionId: "developer",
    })
    return dispatch()
}

function getTaskSummaries(tasks: Task[]): string[] {
    return tasks.map(({ type, positionId }) => `${type} @${positionId}`)
}

describe("AICo's listeners", () => {
    test("give a ticket's assignee Handle once it is created", async () => {
        const { createdTasks } = await createDeveloperTicket()

        expect(getTaskSummaries(createdTasks)).toEqual(["handle @developer"])
        expect(createdTasks[0]?.params).toEqual({ ticketNumber: 1 })
    })

    test("give the task each act calls for to the position that has the hand", async () => {
        await createDeveloperTicket()

        const asking = await act("ask", developer)
        const answering = await act("answer", director)
        const delivering = await act("deliver", developer)
        const refusing = await act("refuse", director)

        expect(getTaskSummaries(asking.createdTasks)).toEqual([
            "answer @director",
        ])
        expect(getTaskSummaries(answering.createdTasks)).toEqual([
            "resume @developer",
        ])
        expect(getTaskSummaries(delivering.createdTasks)).toEqual([
            "validate @director",
        ])
        expect(getTaskSummaries(refusing.createdTasks)).toEqual([
            "resume @developer",
        ])
    })

    test("give the assignee Resume once its session ends without passing the hand", async () => {
        await createDeveloperTicket()

        const { createdTasks } = await endSessionOf("developer")

        expect(getTaskSummaries(createdTasks)).toEqual(["resume @developer"])
    })

    test("give the requester its task again once its session ends without acting", async () => {
        await createDeveloperTicket()
        await act("ask", developer)

        const { createdTasks } = await endSessionOf("director")

        expect(getTaskSummaries(createdTasks)).toEqual(["answer @director"])
    })

    test("give nothing more once a session ended passing the hand", async () => {
        await createDeveloperTicket()
        await act("ask", developer)

        const { createdTasks } = await endSessionOf("developer", true)

        expect(createdTasks).toEqual([])
    })

    test("cancel a closed ticket's queued tasks", async () => {
        await createDeveloperTicket()

        const { cancelledTasks } = await act("cancel", director)

        expect(getTaskSummaries(cancelledTasks)).toEqual(["handle @developer"])
    })

    test("give no task on a ticket already closed", async () => {
        await createExampleTicket(projectRoot, {
            rawAssigneePositionId: "developer",
        })

        const { createdTasks } = await act("cancel", director)

        expect(createdTasks).toEqual([])
    })

    test("give the director Analyse the failure once a task failed", async () => {
        await createDeveloperTicket()
        const failedTask = await findTaskOf("developer", "queued")

        const { createdTasks } = await failTaskOf("developer")

        expect(getTaskSummaries(createdTasks)).toEqual([
            "analyse-failure @director",
        ])
        expect(createdTasks[0]?.params).toEqual({ taskId: failedTask?.id })
    })

    test("give the position with the hand its task again at the relaunch", async () => {
        await createDeveloperTicket()
        await failTaskOf("developer")

        const { createdTasks } = await relaunch()

        expect(getTaskSummaries(createdTasks)).toEqual(["resume @developer"])
    })

    test("give no task at the relaunch on a ticket closed during the pause", async () => {
        await createDeveloperTicket()
        await failTaskOf("developer")
        await act("cancel", director)

        const { createdTasks } = await relaunch()

        expect(createdTasks).toEqual([])
    })

    test("give no task at a relaunch that follows no failure", async () => {
        await createDeveloperTicket()
        await pauseCompany(await loadJournal(projectRoot))

        const { createdTasks } = await relaunch()

        expect(createdTasks).toEqual([])
    })
})
