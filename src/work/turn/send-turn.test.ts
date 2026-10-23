import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { getEventOfType } from "../../journal/get-event-of-type.ts"
import type { EventType, JournalEvent } from "../../journal/schema.ts"
import { listEvents } from "../../journal/storage.ts"
import { messageSentEventType } from "../../messaging/message/schema.ts"
import { listMessages } from "../../messaging/message/storage.ts"
import { julieEnvironment } from "../create-company-with-human-employee.testing.ts"
import { reminderText } from "../run/apply-assistant-turn.ts"
import { loadRun } from "../run/storage.ts"
import type { OpenedTask } from "../task/open-next-task.ts"
import { taskDoneEventType, taskFailedEventType } from "../task/schema.ts"
import { addTurnText } from "./add-turn-text.ts"
import { addTurnTool } from "./add-turn-tool.ts"
import { createCompanyWithTaskInProgress } from "./create-company-with-task-in-progress.testing.ts"
import { sendTurn } from "./send-turn.ts"
import { loadStagedTurn } from "./storage.ts"

let projectRoot: string
let threadId: string
let openedTask: OpenedTask

beforeEach(async () => {
    const company = await createCompanyWithTaskInProgress()
    projectRoot = company.projectRoot
    threadId = company.threadId
    openedTask = company.openedTask
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function addJulieToolCall(toolName: string, input: object) {
    const rawInput = JSON.stringify(input)
    await addTurnTool(projectRoot, julieEnvironment, { toolName, rawInput })
}

async function sendJulieTurn() {
    return sendTurn(projectRoot, julieEnvironment)
}

async function findLastEvent<Content extends Omit<JournalEvent, "id">>(
    eventType: EventType<Content>,
) {
    const events = await listEvents(projectRoot)
    return events
        .map((event) => getEventOfType(event, eventType))
        .findLast(Boolean)
}

describe("sendTurn", () => {
    test("runs the turn's calls as the person's position and employee", async () => {
        await addJulieToolCall("message_send", { body: "@director Friday." })

        await sendJulieTurn()

        const [, answer] = await listMessages(projectRoot, threadId)
        expect(answer).toMatchObject({
            position: { id: "qa-tester", title: "QA" },
            employee: { id: "julie", name: "Julie" },
            body: "@director Friday.",
        })
    })

    test("gives back the turn and its answer, as the run's transcript keeps them", async () => {
        await addJulieToolCall("message_send", { body: "Friday." })

        const { sentTurn, answeringTurn } = await sendJulieTurn()

        const run = await loadRun(projectRoot, openedTask.run.id)
        const [, keptSentTurn, keptAnsweringTurn] = run.conversation.turns
        expect(keptSentTurn).toEqual(sentTurn)
        expect(keptAnsweringTurn).toEqual(answeringTurn)
        expect(sentTurn).toEqual({
            role: "assistant",
            blocks: [
                {
                    type: "tool-call",
                    id: expect.stringMatching(/^call_/),
                    name: "message_send",
                    input: { body: "Friday." },
                },
            ],
        })
        expect(answeringTurn).toMatchObject({
            role: "user",
            blocks: [
                {
                    type: "tool-result",
                    text: `Sent as entry #2 of thread ${threadId}.`,
                    isError: false,
                },
            ],
        })
    })

    test("records what the run causes at the depth of the task's cause", async () => {
        await addJulieToolCall("message_send", { body: "@designer Logo?" })

        await sendJulieTurn()

        const messageSentEvent = await findLastEvent(messageSentEventType)
        expect(messageSentEvent?.depth).toBe(0)
        expect(messageSentEvent?.runId).toBe(openedTask.run.id)
    })

    test("empties the turn once it is sent", async () => {
        await addJulieToolCall("message_send", { body: "Friday." })

        await sendJulieTurn()

        const stagedTurn = await loadStagedTurn(projectRoot, openedTask.run.id)
        expect(stagedTurn).toEqual({ blocks: [] })
    })

    test("goes on from the turns sent before, in a later call", async () => {
        await addJulieToolCall("message_send", { body: "Friday." })
        await sendJulieTurn()
        await addJulieToolCall("task_mark-as-done", { summary: "Answered." })

        const { taskEnding } = await sendJulieTurn()

        const run = await loadRun(projectRoot, openedTask.run.id)
        expect(taskEnding).toEqual({ state: "done", summary: "Answered." })
        expect(run.conversation.turns).toHaveLength(5)
    })

    test("ends the task when the turn marks it as done, with its result", async () => {
        await addJulieToolCall("message_send", { body: "Friday." })
        await addJulieToolCall("task_mark-as-done", { summary: "Answered." })

        await sendJulieTurn()

        const [, answer] = await listMessages(projectRoot, threadId)
        expect(await findLastEvent(taskDoneEventType)).toEqual({
            id: expect.any(String),
            type: "task-done",
            occurredAt: expect.any(String),
            depth: 0,
            taskId: openedTask.task.id,
            runId: openedTask.run.id,
            summary: "Answered.",
            result: { lastReadEntryId: answer?.id },
        })
    })

    test("reminds the person who calls no tool, as it reminds a model", async () => {
        await addTurnText(projectRoot, julieEnvironment, "Let me think.")

        const { answeringTurn, taskEnding } = await sendJulieTurn()

        const reminderBlock = { type: "text" as const, text: reminderText }
        expect(taskEnding).toBeUndefined()
        expect(answeringTurn?.blocks).toEqual([reminderBlock])
    })

    test("fails the task at a second turn that calls no tool", async () => {
        await addTurnText(projectRoot, julieEnvironment, "Let me think.")
        await sendJulieTurn()
        await addTurnText(projectRoot, julieEnvironment, "Still thinking.")

        const { taskEnding } = await sendJulieTurn()

        const reason =
            "Two turns ended without calling a tool, the second after a reminder."
        expect(taskEnding).toEqual({ state: "failed", reason })
        expect(await findLastEvent(taskFailedEventType)).toMatchObject({
            depth: 0,
            taskId: openedTask.task.id,
            reason,
        })
    })

    test("refuses an empty turn", async () => {
        const sending = sendJulieTurn()

        await expect(sending).rejects.toThrow(
            "Your turn is empty: add to it with `aico turn add text` or `aico turn add tool`.",
        )
    })
})
