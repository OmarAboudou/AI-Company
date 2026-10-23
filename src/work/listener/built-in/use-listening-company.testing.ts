import { afterEach, beforeEach } from "bun:test"
import { rm } from "node:fs/promises"
import { recordEvent } from "../../../journal/record-event.ts"
import { loadJournal } from "../../../journal/storage.ts"
import type { Author } from "../../../messaging/message/schema.ts"
import { actOnTicket } from "../../../messaging/ticket/act/act-on-ticket.ts"
import type { MessageActName } from "../../../messaging/ticket/act/ticket-acts.ts"
import { createExampleTicket } from "../../../messaging/ticket/create-example-ticket.testing.ts"
import { createTemporaryCompany } from "../../../organization/company/create-temporary-company.testing.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
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

export const founder: Author = {
    position: { id: "founder", title: "Founder" },
    committer,
}

export const developer: Author = {
    position: { id: "developer", title: "Developer" },
    committer,
}

export function getTaskSummaries(tasks: Task[]): string[] {
    return tasks.map(({ type, positionId }) => `${type} @${positionId}`)
}

// A company with a developer, whose events AICo's listeners hear as each
// step of a ticket's lifecycle happens.
export function useListeningCompany() {
    let projectRoot = ""

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
        return dispatchEvents(
            await loadJournal(projectRoot),
            builtInWorkCatalog,
        )
    }

    async function findTaskOf(positionId: string, state: string) {
        const [tasks, journal] = await Promise.all([
            listTasks(projectRoot),
            loadJournal(projectRoot),
        ])
        const taskStates = getTaskStates(tasks, journal.events)
        return tasks.find(
            (task) =>
                task.positionId === positionId &&
                taskStates.get(task.id) === state,
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
                worker: { kind: "user" },
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
    async function act(actName: MessageActName, author: Author) {
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

    return {
        getProjectRoot: () => projectRoot,
        dispatch,
        findTaskOf,
        endSessionOf,
        failTaskOf,
        relaunch,
        act,
        createDeveloperTicket,
    }
}
