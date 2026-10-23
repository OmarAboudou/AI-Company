import { describe, expect, test } from "bun:test"
import type { JournalEvent } from "../../journal/schema.ts"
import { getTaskStates } from "./get-task-states.ts"
import type { Task } from "./schema.ts"

const developerTask: Task = {
    id: "20261018-140323-000-77aa",
    askedAt: "2026-10-18T14:03:23.000Z",
    type: "example",
    params: { ticketNumber: 1 },
    positionId: "backend-developer",
    causeEventId: "20261018-140322-123-5d1e",
}

const testerTask: Task = {
    ...developerTask,
    id: "20261018-140323-001-0c4f",
    positionId: "qa-tester",
}

const eventFields = {
    occurredAt: "2026-10-18T14:03:24.000Z",
    depth: 1,
    taskId: developerTask.id,
}

const developerTaskEvents = {
    created: { id: "20261018-140323-000-0a01", type: "task-created" },
    started: {
        id: "20261018-140324-000-0a02",
        type: "task-started",
        runId: "20261018-140324-000-1b2c",
        worker: { kind: "employee", employeeId: "claude" },
    },
    done: {
        id: "20261018-140351-000-0a03",
        type: "task-done",
        summary: "Answered: Hono, for Bun.",
        result: {},
    },
    failed: {
        id: "20261018-140351-000-0a04",
        type: "task-failed",
        reason: "The ticket asks nothing.",
    },
    cancelled: {
        id: "20261018-140351-000-0a05",
        type: "task-cancelled",
        reason: "Ticket #1 was closed.",
    },
} as const

function getDeveloperTaskState(
    eventNames: (keyof typeof developerTaskEvents)[],
) {
    const events: JournalEvent[] = eventNames.map((name) => ({
        ...eventFields,
        ...developerTaskEvents[name],
    }))
    return getTaskStates([developerTask], events).get(developerTask.id)
}

describe("getTaskStates", () => {
    test("is queued for a task until it starts", () => {
        expect(getDeveloperTaskState([])).toBe("queued")
        expect(getDeveloperTaskState(["created"])).toBe("queued")
    })

    test("is running once the task starts", () => {
        const state = getDeveloperTaskState(["created", "started"])

        expect(state).toBe("running")
    })

    test("is done once marked as done", () => {
        const state = getDeveloperTaskState(["created", "started", "done"])

        expect(state).toBe("done")
    })

    test("has failed once the task is given up", () => {
        const state = getDeveloperTaskState(["created", "started", "failed"])

        expect(state).toBe("failed")
    })

    test("is cancelled once the task became pointless", () => {
        const state = getDeveloperTaskState(["created", "cancelled"])

        expect(state).toBe("cancelled")
    })

    test("follows each task's own events", () => {
        const testerTaskStarted = {
            ...eventFields,
            ...developerTaskEvents.started,
            taskId: testerTask.id,
        }

        const taskStates = getTaskStates(
            [developerTask, testerTask],
            [testerTaskStarted],
        )

        expect(taskStates.get(developerTask.id)).toBe("queued")
        expect(taskStates.get(testerTask.id)).toBe("running")
    })
})
