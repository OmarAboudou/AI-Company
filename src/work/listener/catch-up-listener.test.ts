import { describe, expect, test } from "bun:test"
import type { EventOfType } from "../../journal/schema.ts"
import type { messageSentEventType } from "../../messaging/message/schema.ts"
import type { TaskState } from "../task/get-task-states.ts"
import type { Task } from "../task/schema.ts"
import { catchUpListener } from "./catch-up-listener.ts"
import type { ListenerContext } from "./define-listener.ts"

type MessageSentEvent = EventOfType<typeof messageSentEventType>

const threadId = "2026-10-18-choice-of-framework"

const answerSent: MessageSentEvent = {
    id: "20261018-150000-000-5d1e",
    type: "message-sent",
    occurredAt: "2026-10-18T15:00:00.000Z",
    depth: 0,
    threadId,
    messageId: "20261018-150000-000-3f9a",
    positionId: "director",
    mentions: [],
}

const directorCatchUp: Task = {
    id: "20261018-140323-000-77aa",
    askedAt: "2026-10-18T14:03:23.000Z",
    type: "catch-up-thread",
    params: { threadId },
    positionId: "director",
    causeEventId: "20261018-140322-123-5d1e",
}

function createCompany(
    tasks: Task[],
    state: TaskState = "waiting",
): ListenerContext {
    const taskStates = new Map(tasks.map(({ id }) => [id, state]))
    return { tasks, taskStates, positions: [] }
}

const emptyCompany = createCompany([])

describe("catchUpListener", () => {
    test("asks each position a message mentions to catch up on its thread", () => {
        const questionSent = {
            ...answerSent,
            mentions: ["backend-developer", "qa-tester"],
        }

        const effects = catchUpListener.getEffects(questionSent, emptyCompany)

        expect(effects).toEqual([
            {
                kind: "create-task",
                task: {
                    type: "catch-up-thread",
                    positionId: "backend-developer",
                    params: { threadId },
                },
            },
            {
                kind: "create-task",
                task: {
                    type: "catch-up-thread",
                    positionId: "qa-tester",
                    params: { threadId },
                },
            },
        ])
    })

    test("asks nothing for a message without mentions", () => {
        expect(catchUpListener.getEffects(answerSent, emptyCompany)).toEqual([])
    })
})

describe("catchUpListener when a person writes in a thread", () => {
    test("marks the writer's catch-ups of the thread as done, read up to the message", () => {
        const company = createCompany([directorCatchUp])

        const effects = catchUpListener.getEffects(answerSent, company)

        expect(effects).toEqual([
            {
                kind: "mark-task-as-done",
                taskId: directorCatchUp.id,
                summary: "Sent a message in the thread.",
                result: { lastReadEntryId: answerSent.messageId },
            },
        ])
    })

    test("leaves the catch-ups of other positions and other threads", () => {
        const testerCatchUp = { ...directorCatchUp, positionId: "qa-tester" }
        const budgetCatchUp = {
            ...directorCatchUp,
            params: { threadId: "2026-10-18-budget" },
        }
        const company = createCompany([testerCatchUp, budgetCatchUp])

        expect(catchUpListener.getEffects(answerSent, company)).toEqual([])
    })

    test("leaves a catch-up asked after the message", () => {
        const laterCatchUp = {
            ...directorCatchUp,
            causeEventId: "20261018-160000-000-6e2f",
        }
        const company = createCompany([laterCatchUp])

        expect(catchUpListener.getEffects(answerSent, company)).toEqual([])
    })

    test("leaves a catch-up that already ended", () => {
        const company = createCompany([directorCatchUp], "done")

        expect(catchUpListener.getEffects(answerSent, company)).toEqual([])
    })

    test("leaves the catch-ups of a position writing in a run", () => {
        const runAnswerSent = {
            ...answerSent,
            runId: "20261018-150000-000-1b2c",
        }
        const company = createCompany([directorCatchUp])

        expect(catchUpListener.getEffects(runAnswerSent, company)).toEqual([])
    })
})
