import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { recordEvent } from "../../journal/record-event.ts"
import type { JournalEvent } from "../../journal/schema.ts"
import { listEvents, saveEvent } from "../../journal/storage.ts"
import { messageSentEventType } from "../../messaging/message/schema.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { loadCompany, saveCompany } from "../../organization/company/storage.ts"
import { savePosition } from "../../organization/position/storage.ts"
import { createTask } from "../task/create-task.ts"
import { getTaskPositionId } from "../task/get-task-position-id.ts"
import type { UncreatedTask } from "../task/schema.ts"
import { listTasks } from "../task/storage.ts"
import { createTaskOnce } from "./create-task-once.ts"
import { loadDispatching } from "./load-dispatching.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const threadId = "2026-10-18-choice-of-framework"

function recordQuestionSent(depth = 0) {
    return recordEvent(projectRoot, messageSentEventType, {
        depth,
        threadId,
        messageId: "20261018-140322-123-3f9a",
        positionId: "director",
        mentions: ["qa-tester"],
    })
}

function createCatchUp(positionId = "qa-tester"): UncreatedTask {
    return { type: "catch-up-thread", positionId, params: { threadId } }
}

async function createInNewDispatching(
    uncreatedTask: UncreatedTask,
    causeEvent: JournalEvent,
) {
    const dispatching = await loadDispatching(projectRoot)
    await createTaskOnce(uncreatedTask, causeEvent, dispatching)
    return dispatching
}

async function listTaskCreatedDepths(): Promise<number[]> {
    const events = await listEvents(projectRoot)
    return events
        .filter(({ type }) => type === "task-created")
        .map(({ depth }) => depth)
}

describe("createTaskOnce", () => {
    test("creates the task a step deeper than its cause", async () => {
        const questionSent = await recordQuestionSent()

        const { createdTasks } = await createInNewDispatching(
            createCatchUp(),
            questionSent,
        )

        expect(createdTasks).toMatchObject([
            {
                type: "catch-up-thread",
                params: { threadId },
                positionId: "qa-tester",
                causeEventId: questionSent.id,
            },
        ])
        expect(await listTasks(projectRoot)).toEqual(createdTasks)
        expect(await listTaskCreatedDepths()).toEqual([1])
    })

    test("never creates a task twice, even asked again for it", async () => {
        const questionSent = await recordQuestionSent()
        await createInNewDispatching(createCatchUp(), questionSent)

        const { createdTasks } = await createInNewDispatching(
            createCatchUp(),
            questionSent,
        )

        expect(createdTasks).toEqual([])
        expect(await listTasks(projectRoot)).toHaveLength(1)
    })
})

describe("createTaskOnce at the end of a chain", () => {
    async function setMaxTaskDepth(maxTaskDepth: number) {
        const company = await loadCompany(projectRoot)
        await saveCompany(projectRoot, { ...company, maxTaskDepth })
    }

    test("creates tasks up to the company's maximum depth", async () => {
        await setMaxTaskDepth(2)
        const answerSent = await recordQuestionSent(1)

        const { createdTasks } = await createInNewDispatching(
            createCatchUp(),
            answerSent,
        )

        expect(createdTasks).toHaveLength(1)
        expect(await listTaskCreatedDepths()).toEqual([2])
    })

    test("records a stopped chain instead of a deeper task", async () => {
        await setMaxTaskDepth(2)
        const answerSent = await recordQuestionSent(2)

        const dispatching = await createInNewDispatching(
            createCatchUp(),
            answerSent,
        )

        const [chainStoppedEvent] = dispatching.chainStoppedEvents
        const lastEvent = (await listEvents(projectRoot)).at(-1)
        expect(dispatching.createdTasks).toEqual([])
        expect(chainStoppedEvent).toMatchObject({
            type: "chain-stopped",
            depth: 2,
            causeEventId: answerSent.id,
            stoppedTask: createCatchUp(),
        })
        expect(lastEvent).toEqual(chainStoppedEvent)
    })

    test("stops chains beyond 200 tasks, unless management sets it", async () => {
        const deepestAnswerSent = await recordQuestionSent(199)
        const tooDeepAnswerSent = await recordQuestionSent(200)

        const deepest = await createInNewDispatching(
            createCatchUp(),
            deepestAnswerSent,
        )
        const tooDeep = await createInNewDispatching(
            createCatchUp(),
            tooDeepAnswerSent,
        )

        expect(deepest.createdTasks).toHaveLength(1)
        expect(tooDeep.chainStoppedEvents).toHaveLength(1)
    })

    test("records a stopped chain once, even asked again for the task", async () => {
        const answerSent = await recordQuestionSent(200)
        await createInNewDispatching(createCatchUp(), answerSent)

        const { chainStoppedEvents } = await createInNewDispatching(
            createCatchUp(),
            answerSent,
        )

        expect(chainStoppedEvents).toEqual([])
    })
})

describe("createTaskOnce through the positions' id history", () => {
    const questionSent = {
        id: "20261018-140322-123-5d1e",
        type: "message-sent",
        occurredAt: "2026-10-18T14:03:22.123Z",
        depth: 0,
        threadId,
        messageId: "20261018-140322-123-3f9a",
        positionId: "director",
        mentions: ["backend-developer"],
    }

    beforeEach(async () => {
        await Promise.all([
            savePosition(projectRoot, {
                id: "api-developer",
                title: "API Developer",
                description: "",
                formerIds: [
                    {
                        id: "backend-developer",
                        until: "2026-10-19T09:00:00.000Z",
                    },
                ],
            }),
            saveEvent(projectRoot, questionSent),
        ])
    })

    test("creates the task of a position renamed since, read under its new id", async () => {
        const { createdTasks, positions } = await createInNewDispatching(
            createCatchUp("backend-developer"),
            questionSent,
        )

        const [task] = createdTasks
        expect(task?.positionId).toBe("backend-developer")
        expect(task && getTaskPositionId(task, positions)).toBe("api-developer")
    })

    test("recognizes the task asked before the position was renamed", async () => {
        const askedTask = createCatchUp("backend-developer")
        await createTask(projectRoot, askedTask, questionSent)

        const { createdTasks } = await createInNewDispatching(
            askedTask,
            questionSent,
        )

        expect(createdTasks).toEqual([])
    })
})
