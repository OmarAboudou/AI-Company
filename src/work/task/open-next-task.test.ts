import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { getEventOfType } from "../../journal/get-event-of-type.ts"
import { recordEvent } from "../../journal/record-event.ts"
import { listEvents, loadJournal } from "../../journal/storage.ts"
import { messageSentEventType } from "../../messaging/message/schema.ts"
import { createExampleTicket } from "../../messaging/ticket/create-example-ticket.testing.ts"
import { createPosition } from "../../organization/position/create-position.ts"
import { createCompanyWorkedByDirectors } from "../create-company-worked-by-directors.testing.ts"
import {
    createExampleWorkCatalog,
    exampleTaskType,
} from "../create-example-work-catalog.testing.ts"
import { sendExampleMessage } from "../send-example-message.testing.ts"
import { createUncreatedTask } from "../task-type/create-uncreated-task.ts"
import { addTurnText } from "../turn/add-turn-text.ts"
import { createTask } from "./create-task.ts"
import { openNextTask } from "./open-next-task.ts"
import { taskStartedEventType } from "./schema.ts"

const exampleCatalog = createExampleWorkCatalog()
let projectRoot: string
let ticketNumber: number

beforeEach(async () => {
    const company = await createCompanyWorkedByDirectors()
    projectRoot = company.projectRoot
    ticketNumber = company.ticketNumber
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function ask(
    askedPositionId: string,
    body: string,
    authorPositionId = "director",
) {
    const sending = await sendExampleMessage(
        projectRoot,
        ticketNumber,
        body,
        createExampleWorkCatalog([askedPositionId]),
        { positionId: authorPositionId },
    )
    const [task] = sending.createdTasks
    if (task === undefined) {
        throw new Error(`"${body}" created no task`)
    }
    return { task }
}

async function openNextExampleTask(environment: NodeJS.ProcessEnv = {}) {
    return openNextTask(projectRoot, environment, exampleCatalog)
}

async function listTaskStartedEvents() {
    const events = await listEvents(projectRoot)
    return events.flatMap((event) => {
        const startedEvent = getEventOfType(event, taskStartedEventType)
        return startedEvent === undefined ? [] : [startedEvent]
    })
}

describe("openNextTask", () => {
    test("opens the oldest pending task of the positions the person works", async () => {
        const shipping = await ask("qa-tester", "Can we ship on Friday?")
        await ask("designer", "Is the logo ready?")

        const { openedTask } = await openNextExampleTask()

        const [taskTurn] = openedTask?.run.conversation.turns ?? []
        expect(openedTask?.task).toEqual(shipping.task)
        expect(openedTask?.position.id).toBe("qa-tester")
        expect(openedTask?.isResumed).toBe(false)
        expect(openedTask?.run.conversation.systemPrompt).toStartWith(
            "You are Omar Aboudou, QA (@qa-tester) at Acme.",
        )
        expect(taskTurn?.blocks).toEqual([
            {
                type: "text",
                text: `Answer the last message of ticket #${ticketNumber}.`,
            },
        ])
    })

    test("starts the person's run, by the directors, without a model", async () => {
        const shipping = await ask("qa-tester", "Can we ship on Friday?")

        const { openedTask } = await openNextExampleTask()

        const [startedEvent] = await listTaskStartedEvents()
        expect(startedEvent).toMatchObject({
            taskId: shipping.task.id,
            runId: openedTask?.run.id,
            worker: { kind: "directors" },
        })
        expect(startedEvent).not.toHaveProperty("model")
    })

    test("gives the run the tools of the task's type, its ticket fixed", async () => {
        await ask("qa-tester", "Can we ship on Friday?")

        const { openedTask } = await openNextExampleTask()

        const tools = openedTask?.run.conversation.tools ?? []
        const sendingTool = tools.find(({ name }) => name === "message_send")
        expect(tools.map(({ name }) => name)).toEqual([
            "message_send",
            "task_mark-as-done",
            "task_mark-as-failed",
            "ticket_show",
        ])
        expect(sendingTool?.description).toStartWith(
            "Send a message in this ticket's discussion,",
        )
    })

    test("starts the person's run at its cause's depth, adding no link", async () => {
        await ask("qa-tester", "Can we ship on Friday?")

        await openNextExampleTask()

        const [startedEvent] = await listTaskStartedEvents()
        expect(startedEvent?.depth).toBe(0)
    })

    test("resumes the task in progress rather than opening another", async () => {
        await ask("qa-tester", "Can we ship on Friday?")
        await ask("designer", "Is the logo ready?")
        const first = await openNextExampleTask()

        const second = await openNextExampleTask()

        expect(second.openedTask?.task).toEqual(first.openedTask?.task)
        expect(second.openedTask?.run.id).toBe(first.openedTask?.run.id)
        expect(second.openedTask?.isResumed).toBe(true)
        expect(await listTaskStartedEvents()).toHaveLength(1)
    })

    test("gives a resumed task the turn its person prepares", async () => {
        await ask("qa-tester", "Can we ship on Friday?")
        const first = await openNextExampleTask()
        await addTurnText(projectRoot, {}, "Checking.")

        const second = await openNextExampleTask()

        const textBlock = { type: "text" as const, text: "Checking." }
        expect(first.openedTask?.stagedTurn).toEqual({ blocks: [] })
        expect(second.openedTask?.stagedTurn).toEqual({ blocks: [textBlock] })
    })

    test("starts afresh a task whose run someone else started", async () => {
        const shipping = await ask("qa-tester", "Can we ship on Friday?")
        const modelRunId = "20261018-140324-000-1b2c"
        const journal = await loadJournal(projectRoot)
        await recordEvent(journal, taskStartedEventType, {
            depth: 1,
            taskId: shipping.task.id,
            runId: modelRunId,
            worker: { kind: "employee", employeeId: "claude" },
            model: { providerId: "anthropic", modelId: "opus" },
        })

        const { openedTask } = await openNextExampleTask()

        expect(openedTask?.task).toEqual(shipping.task)
        expect(openedTask?.isResumed).toBe(false)
        expect(openedTask?.run.id).not.toBe(modelRunId)
    })

    test("opens nothing when no task waits for the person", async () => {
        const result = await openNextExampleTask()

        expect(result).toEqual({ openedTask: undefined, endedTasks: [] })
    })
})

describe("openNextTask among the person's positions", () => {
    test("opens only the selected position's tasks when one is selected", async () => {
        await ask("qa-tester", "Can we ship on Friday?")
        const logo = await ask("designer", "Is the logo ready?")
        const environment = { AICO_CURRENT_POSITION_ID: "designer" }

        const { openedTask } = await openNextExampleTask(environment)

        expect(openedTask?.task).toEqual(logo.task)
    })

    test("refuses a selected position the person doesn't work", async () => {
        await createPosition(projectRoot, "support", {
            title: "Support",
            description: "",
        })
        const environment = { AICO_CURRENT_POSITION_ID: "support" }

        const opening = openNextExampleTask(environment)

        await expect(opening).rejects.toThrow("isn't one you work now")
    })

    test("lets the directors work the tasks of the director's position", async () => {
        const question = await ask("director", "Ready?", "qa-tester")

        const { openedTask } = await openNextExampleTask({})

        const [startedEvent] = await listTaskStartedEvents()
        expect(openedTask?.task).toEqual(question.task)
        expect(openedTask?.run.conversation.systemPrompt).toStartWith(
            "You are Omar Aboudou, Director (@director) at Acme.",
        )
        expect(startedEvent?.worker).toEqual({ kind: "directors" })
    })
})

describe("openNextTask with a task that needs no run", () => {
    async function createAnsweredTask(doneSummary: string) {
        const journal = await loadJournal(projectRoot)
        const questionSent = await recordEvent(journal, messageSentEventType, {
            depth: 0,
            ticketNumber,
            messageId: "20261018-140322-123-3f9a",
            positionId: "director",
        })
        const answeredTask = createUncreatedTask(exampleTaskType, {
            positionId: "qa-tester",
            params: { ticketNumber, doneSummary },
        })
        return createTask(journal, answeredTask, questionSent)
    }

    test("marks it as done at once, then opens the next", async () => {
        const doneSummary = "Already answered."
        const answeredTask = await createAnsweredTask(doneSummary)
        const logo = await ask("designer", "Is the logo ready?")

        const { openedTask, endedTasks } = await openNextExampleTask()

        const taskEnding = { state: "done", summary: doneSummary } as const
        expect(endedTasks).toEqual([{ task: answeredTask, taskEnding }])
        expect(openedTask?.task).toEqual(logo.task)
    })

    test("cancels at once a task that became pointless, then opens the next", async () => {
        const shipping = await ask("qa-tester", "Can we ship on Friday?")
        await sendExampleMessage(
            projectRoot,
            ticketNumber,
            "Stop.",
            createExampleWorkCatalog(),
        )
        const logoTicket = await createExampleTicket(projectRoot)
        const logo = await sendExampleMessage(
            projectRoot,
            logoTicket.number,
            "Is the logo ready?",
            createExampleWorkCatalog(["designer"]),
        )

        const { openedTask, endedTasks } = await openNextExampleTask()

        const reason = `Ticket #${ticketNumber}'s discussion says Stop.`
        const taskEnding = { state: "cancelled", reason } as const
        expect(endedTasks).toEqual([{ task: shipping.task, taskEnding }])
        expect(openedTask?.task).toEqual(logo.createdTasks[0])
    })
})
