import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { getEventOfType } from "../../journal/get-event-of-type.ts"
import { recordEvent } from "../../journal/record-event.ts"
import { listEvents, loadJournal } from "../../journal/storage.ts"
import { sendMessage } from "../../messaging/message/send-message.ts"
import { unassignPosition } from "../../organization/position/unassign-position.ts"
import {
    createCompanyWithHumanEmployee,
    julieEnvironment,
} from "../create-company-with-human-employee.testing.ts"
import { addTurnText } from "../turn/add-turn-text.ts"
import { openNextTask } from "./open-next-task.ts"
import { taskDoneEventType, taskStartedEventType } from "./schema.ts"

let projectRoot: string
let threadId: string

beforeEach(async () => {
    const company = await createCompanyWithHumanEmployee()
    projectRoot = company.projectRoot
    threadId = company.threadId
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function ask(body: string, julieAsPositionId?: string) {
    const environment = julieAsPositionId === undefined ? {} : julieEnvironment
    const sending = await sendMessage(projectRoot, environment, threadId, {
        body,
        ...(julieAsPositionId !== undefined && {
            asPositionId: julieAsPositionId,
        }),
    })
    const [task] = sending.createdTasks
    if (task === undefined) {
        throw new Error(`"${body}" created no task`)
    }
    return { messageId: sending.message.id, task }
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
        const shipping = await ask("@qa-tester Can we ship on Friday?")
        await ask("@designer Is the logo ready?")

        const { openedTask } = await openNextTask(projectRoot, julieEnvironment)

        const [taskTurn] = openedTask?.run.conversation.turns ?? []
        expect(openedTask?.task).toEqual(shipping.task)
        expect(openedTask?.position.id).toBe("qa-tester")
        expect(openedTask?.isResumed).toBe(false)
        expect(openedTask?.run.conversation.systemPrompt).toStartWith(
            "You are Julie, QA (@qa-tester) at Acme.",
        )
        expect(taskTurn?.blocks).toMatchObject([
            { text: expect.stringContaining("Can we ship on Friday?") },
        ])
    })

    test("starts the person's run, by its employee, without a model", async () => {
        const shipping = await ask("@qa-tester Can we ship on Friday?")

        const { openedTask } = await openNextTask(projectRoot, julieEnvironment)

        const [startedEvent] = await listTaskStartedEvents()
        expect(startedEvent).toMatchObject({
            taskId: shipping.task.id,
            runId: openedTask?.run.id,
            worker: { kind: "employee", employeeId: "julie" },
        })
        expect(startedEvent).not.toHaveProperty("model")
    })

    test("gives the run the tools of the task's type, its thread fixed", async () => {
        await ask("@qa-tester Can we ship on Friday?")

        const { openedTask } = await openNextTask(projectRoot, julieEnvironment)

        const tools = openedTask?.run.conversation.tools ?? []
        const sendingTool = tools.find(({ name }) => name === "message_send")
        expect(tools.map(({ name }) => name)).toEqual([
            "message_send",
            "task_mark-as-done",
            "task_mark-as-failed",
            "thread_show",
        ])
        expect(sendingTool?.description).toStartWith(
            "Send a message in this thread,",
        )
    })

    test("starts the person's run at its cause's depth, adding no link", async () => {
        await ask("@qa-tester Can we ship on Friday?")

        await openNextTask(projectRoot, julieEnvironment)

        const [startedEvent] = await listTaskStartedEvents()
        expect(startedEvent?.depth).toBe(0)
    })

    test("resumes the task in progress rather than opening another", async () => {
        await ask("@qa-tester Can we ship on Friday?")
        await ask("@designer Is the logo ready?")
        const first = await openNextTask(projectRoot, julieEnvironment)

        const second = await openNextTask(projectRoot, julieEnvironment)

        expect(second.openedTask?.task).toEqual(first.openedTask?.task)
        expect(second.openedTask?.run.id).toBe(first.openedTask?.run.id)
        expect(second.openedTask?.isResumed).toBe(true)
        expect(await listTaskStartedEvents()).toHaveLength(1)
    })

    test("gives a resumed task the turn its person prepares", async () => {
        await ask("@qa-tester Can we ship on Friday?")
        const first = await openNextTask(projectRoot, julieEnvironment)
        await addTurnText(projectRoot, julieEnvironment, "Checking.")

        const second = await openNextTask(projectRoot, julieEnvironment)

        const textBlock = { type: "text" as const, text: "Checking." }
        expect(first.openedTask?.stagedTurn).toEqual({ blocks: [] })
        expect(second.openedTask?.stagedTurn).toEqual({ blocks: [textBlock] })
    })

    test("starts afresh a task whose run someone else started", async () => {
        const shipping = await ask("@qa-tester Can we ship on Friday?")
        const modelRunId = "20261018-140324-000-1b2c"
        const journal = await loadJournal(projectRoot)
        await recordEvent(journal, taskStartedEventType, {
            depth: 1,
            taskId: shipping.task.id,
            runId: modelRunId,
            worker: { kind: "employee", employeeId: "claude" },
            model: { providerId: "anthropic", modelId: "opus" },
        })

        const { openedTask } = await openNextTask(projectRoot, julieEnvironment)

        expect(openedTask?.task).toEqual(shipping.task)
        expect(openedTask?.isResumed).toBe(false)
        expect(openedTask?.run.id).not.toBe(modelRunId)
    })

    test("opens nothing when no task waits for the person", async () => {
        const result = await openNextTask(projectRoot, julieEnvironment)

        expect(result).toEqual({ openedTask: undefined, doneTasks: [] })
    })
})

describe("openNextTask among the person's positions", () => {
    test("opens only the selected position's tasks when one is selected", async () => {
        await ask("@qa-tester Can we ship on Friday?")
        const logo = await ask("@designer Is the logo ready?")
        const environment = {
            ...julieEnvironment,
            AICO_CURRENT_POSITION_ID: "designer",
        }

        const { openedTask } = await openNextTask(projectRoot, environment)

        expect(openedTask?.task).toEqual(logo.task)
    })

    test("refuses a selected position the person doesn't work", async () => {
        const environment = {
            ...julieEnvironment,
            AICO_CURRENT_POSITION_ID: "director",
        }

        const opening = openNextTask(projectRoot, environment)

        await expect(opening).rejects.toThrow("isn't one you work now")
    })

    test("refuses an employee who works no position", async () => {
        await unassignPosition(projectRoot, "qa-tester")
        await unassignPosition(projectRoot, "designer")

        const opening = openNextTask(projectRoot, julieEnvironment)

        await expect(opening).rejects.toThrow(
            "Julie (julie) works no position, so no task waits for them.",
        )
    })

    test("lets the directors work the tasks of the director's position", async () => {
        const question = await ask("@director Ready?", "qa-tester")

        const { openedTask } = await openNextTask(projectRoot, {})

        const [startedEvent] = await listTaskStartedEvents()
        expect(openedTask?.task).toEqual(question.task)
        expect(openedTask?.run.conversation.systemPrompt).toStartWith(
            "You are Omar Aboudou, Director (@director) at Acme.",
        )
        expect(startedEvent?.worker).toEqual({ kind: "directors" })
    })
})

describe("openNextTask with a task that needs no run", () => {
    test("marks it as done at once, then opens the next", async () => {
        const shipping = await ask("@qa-tester Can we ship on Friday?")
        const followUp = await ask("@qa-tester And the notes?")
        const logo = await ask("@designer Is the logo ready?")
        await recordEvent(await loadJournal(projectRoot), taskDoneEventType, {
            depth: 1,
            taskId: shipping.task.id,
            summary: "Answered both.",
            result: { lastReadEntryId: followUp.messageId },
        })

        const { openedTask, doneTasks } = await openNextTask(
            projectRoot,
            julieEnvironment,
        )

        expect(doneTasks).toEqual([
            {
                task: followUp.task,
                summary:
                    "Already read: an earlier task read the thread up to entry #2.",
            },
        ])
        expect(openedTask?.task).toEqual(logo.task)
    })
})
