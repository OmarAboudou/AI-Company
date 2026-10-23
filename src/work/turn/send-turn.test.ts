import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { runGit } from "../../git/run-git.ts"
import { getEventOfType } from "../../journal/get-event-of-type.ts"
import type { EventType, JournalEvent } from "../../journal/schema.ts"
import { listEvents } from "../../journal/storage.ts"
import { messageSentEventType } from "../../messaging/message/schema.ts"
import { listMessages } from "../../messaging/message/storage.ts"
import { createExampleWorkCatalog } from "../create-example-work-catalog.testing.ts"
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
let ticketNumber: number
let openedTask: OpenedTask

beforeEach(async () => {
    const company = await createCompanyWithTaskInProgress()
    projectRoot = company.projectRoot
    ticketNumber = company.ticketNumber
    openedTask = company.openedTask
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function addToolCall(toolName: string, input: object) {
    const rawInput = JSON.stringify(input)
    await addTurnTool(projectRoot, {}, { toolName, rawInput })
}

async function sendPersonTurn() {
    return sendTurn(
        projectRoot,
        {},
        "aico turn send",
        createExampleWorkCatalog(),
    )
}

async function findLastEvent<Content extends Omit<JournalEvent, "id">>(
    eventType: EventType<Content>,
) {
    const events = await listEvents(projectRoot)
    return events
        .map((event) => getEventOfType(event, eventType))
        .findLast(Boolean)
}

function readLastCommits(count: number) {
    const aicoFolderPath = join(projectRoot, ".aico")
    return Array.from({ length: count }, (_, index) => {
        const revision = `HEAD~${index}`
        const logArgs = ["log", "-1", "--format=%s", revision]
        const showArgs = ["show", "--format=", "--name-only", revision]
        const files = (runGit(aicoFolderPath, showArgs) ?? "").split("\n")
        return {
            subject: runGit(aicoFolderPath, logArgs),
            messageFileCount: files.filter((file) =>
                file.endsWith("/message.json"),
            ).length,
        }
    })
}

describe("sendTurn", () => {
    test("runs the turn's calls from the person's position, as a director", async () => {
        await addToolCall("message_send", { body: "Friday." })

        await sendPersonTurn()

        const [, answer] = await listMessages(projectRoot, ticketNumber)
        expect(answer).toMatchObject({
            position: { id: "qa-tester", title: "QA" },
            committer: { name: "Omar Aboudou", email: "omar@example.com" },
            body: "Friday.",
        })
        expect(answer).not.toHaveProperty("employee")
    })

    test("gives back the turn and its answer, as the run's transcript keeps them", async () => {
        await addToolCall("message_send", { body: "Friday." })

        const { sentTurn, answeringTurn } = await sendPersonTurn()

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
                    text: `Sent as message #2 of ticket #${ticketNumber}.`,
                    isError: false,
                },
            ],
        })
    })

    test("records what the run causes at the depth of the task's cause", async () => {
        await addToolCall("message_send", { body: "Logo?" })

        await sendPersonTurn()

        const messageSentEvent = await findLastEvent(messageSentEventType)
        expect(messageSentEvent?.depth).toBe(0)
        expect(messageSentEvent?.runId).toBe(openedTask.run.id)
    })

    test("empties the turn once it is sent", async () => {
        await addToolCall("message_send", { body: "Friday." })

        await sendPersonTurn()

        const stagedTurn = await loadStagedTurn(projectRoot, openedTask.run.id)
        expect(stagedTurn).toEqual({ blocks: [] })
    })

    test("commits each tool call apart, named after it and its task", async () => {
        await addToolCall("message_send", { body: "Friday." })
        await addToolCall("message_send", { body: "Or Monday." })

        await sendPersonTurn()

        const subject = `message_send in task ${openedTask.task.id}`
        expect(readLastCommits(2)).toEqual([
            { subject, messageFileCount: 1 },
            { subject, messageFileCount: 1 },
        ])
    })

    test("commits the task's end as the command that sends the turn", async () => {
        await addToolCall("task_mark-as-done", { summary: "Answered." })

        await sendPersonTurn()

        const [lastCommit] = readLastCommits(1)
        expect(lastCommit?.subject).toBe("aico turn send")
        expect(await findLastEvent(taskDoneEventType)).toBeDefined()
    })

    test("goes on from the turns sent before, in a later call", async () => {
        await addToolCall("message_send", { body: "Friday." })
        await sendPersonTurn()
        await addToolCall("task_mark-as-done", { summary: "Answered." })

        const { taskEnding } = await sendPersonTurn()

        const run = await loadRun(projectRoot, openedTask.run.id)
        expect(taskEnding).toEqual({ state: "done", summary: "Answered." })
        expect(run.conversation.turns).toHaveLength(5)
    })

    test("ends the task when the turn marks it as done, with its result", async () => {
        await addToolCall("message_send", { body: "Friday." })
        await addToolCall("task_mark-as-done", { summary: "Answered." })

        await sendPersonTurn()

        expect(await findLastEvent(taskDoneEventType)).toEqual({
            id: expect.any(String),
            type: "task-done",
            occurredAt: expect.any(String),
            depth: 0,
            taskId: openedTask.task.id,
            runId: openedTask.run.id,
            summary: "Answered.",
            result: { runId: openedTask.run.id },
        })
    })

    test("reminds the person who calls no tool, as it reminds a model", async () => {
        await addTurnText(projectRoot, {}, "Let me think.")

        const { answeringTurn, taskEnding } = await sendPersonTurn()

        const reminderBlock = { type: "text" as const, text: reminderText }
        expect(taskEnding).toBeUndefined()
        expect(answeringTurn?.blocks).toEqual([reminderBlock])
    })

    test("fails the task at a second turn that calls no tool", async () => {
        await addTurnText(projectRoot, {}, "Let me think.")
        await sendPersonTurn()
        await addTurnText(projectRoot, {}, "Still thinking.")

        const { taskEnding } = await sendPersonTurn()

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
        const sending = sendPersonTurn()

        await expect(sending).rejects.toThrow(
            "Your turn is empty: add to it with `aico turn add text` or `aico turn add tool`.",
        )
    })
})
