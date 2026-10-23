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
import { loadRun } from "../run/storage.ts"
import type { OpenedTask } from "../task/open-next-task.ts"
import { taskCancelledEventType, taskDoneEventType } from "../task/schema.ts"
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

async function sendPersonTurn(shouldEndSession = false) {
    return sendTurn(projectRoot, {}, "aico turn send", {
        catalog: createExampleWorkCatalog(),
        shouldEndSession,
    })
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
        await addToolCall("ticket_deliver", { body: "Ready for Friday." })

        await sendPersonTurn()

        const [, delivery] = await listMessages(projectRoot, ticketNumber)
        expect(delivery).toMatchObject({
            position: { id: "qa-tester", title: "QA" },
            committer: { name: "Omar Aboudou", email: "omar@example.com" },
            body: "Ready for Friday.",
        })
        expect(delivery).not.toHaveProperty("employee")
    })

    test("gives back the turn and its answer, as the run's transcript keeps them", async () => {
        await addToolCall("ticket_show", { from: 1 })

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
                    name: "ticket_show",
                    input: { from: 1 },
                },
            ],
        })
        expect(answeringTurn).toMatchObject({
            role: "user",
            blocks: [
                {
                    type: "tool-result",
                    text: expect.stringMatching(/^Message #1 of ticket #/),
                    isError: false,
                },
            ],
        })
    })

    test("records what the run causes at the depth of the task's cause", async () => {
        await addTurnText(projectRoot, {}, "Logo?")

        await sendPersonTurn()

        const messageSentEvent = await findLastEvent(messageSentEventType)
        expect(messageSentEvent?.depth).toBe(0)
        expect(messageSentEvent?.runId).toBe(openedTask.run.id)
    })

    test("empties the turn once it is sent", async () => {
        await addToolCall("ticket_show", { from: 1 })

        await sendPersonTurn()

        const stagedTurn = await loadStagedTurn(projectRoot, openedTask.run.id)
        expect(stagedTurn).toEqual({ blocks: [] })
    })

    test("commits each tool call apart, named after it and its task", async () => {
        await addToolCall("ticket_deliver", { body: "Ready for Friday." })

        await sendPersonTurn()

        const subject = `ticket_deliver in task ${openedTask.task.id}`
        expect(readLastCommits(2)[1]).toEqual({
            subject,
            messageFileCount: 1,
        })
    })

    test("writes the turn's texts in the ticket's discussion, each in its place", async () => {
        await addTurnText(projectRoot, {}, "Checked the plan.")
        await addToolCall("ticket_deliver", { body: "Ready for Friday." })

        await sendPersonTurn()

        const messages = await listMessages(projectRoot, ticketNumber)
        const textSubject = `text in task ${openedTask.task.id}`
        expect(messages.map(({ body }) => body)).toEqual([
            "Can we ship on Friday?",
            "Checked the plan.",
            "Ready for Friday.",
        ])
        expect(readLastCommits(3)[2]).toEqual({
            subject: textSubject,
            messageFileCount: 1,
        })
    })

    test("commits the task's end as the command that sends the turn", async () => {
        await addTurnText(projectRoot, {}, "Friday works.")

        await sendPersonTurn()

        const [lastCommit] = readLastCommits(1)
        expect(lastCommit?.subject).toBe("aico turn send")
        expect(await findLastEvent(taskDoneEventType)).toBeDefined()
    })

    test("goes on from the turns sent before, in a later call", async () => {
        await addToolCall("ticket_show", { from: 1 })
        await sendPersonTurn()
        await addTurnText(projectRoot, {}, "Done for now.")

        const { taskEnding } = await sendPersonTurn()

        const run = await loadRun(projectRoot, openedTask.run.id)
        expect(taskEnding).toEqual({ state: "done", hasPassedHand: false })
        expect(run.conversation.turns).toHaveLength(4)
    })

    test("ends the task with what its type makes of the run", async () => {
        await addTurnText(projectRoot, {}, "Friday works.")

        await sendPersonTurn()

        expect(await findLastEvent(taskDoneEventType)).toEqual({
            id: expect.any(String),
            type: "task-done",
            occurredAt: expect.any(String),
            depth: 0,
            taskId: openedTask.task.id,
            runId: openedTask.run.id,
            hasPassedHand: false,
            result: { runId: openedTask.run.id },
        })
    })

    test("ends the person's session at a turn without any tool call, as a model's", async () => {
        await addTurnText(projectRoot, {}, "Friday works, I'll confirm Monday.")

        const { answeringTurn, taskEnding } = await sendPersonTurn()

        const messages = await listMessages(projectRoot, ticketNumber)
        expect(taskEnding).toEqual({ state: "done", hasPassedHand: false })
        expect(answeringTurn).toBeUndefined()
        expect(messages.at(-1)?.body).toBe("Friday works, I'll confirm Monday.")
        expect(await findLastEvent(taskDoneEventType)).toMatchObject({
            taskId: openedTask.task.id,
            hasPassedHand: false,
        })
    })

    test("stops the turn at its next call once the task became pointless", async () => {
        await addTurnText(projectRoot, {}, "Stop.")
        await addToolCall("ticket_deliver", { body: "Ready for Friday." })

        const { taskEnding } = await sendPersonTurn()

        const messages = await listMessages(projectRoot, ticketNumber)
        const reason = `Ticket #${ticketNumber}'s discussion says Stop.`
        expect(messages.map(({ body }) => body)).toEqual([
            "Can we ship on Friday?",
            "Stop.",
        ])
        expect(taskEnding).toEqual({ state: "cancelled", reason })
        expect(await findLastEvent(taskCancelledEventType)).toMatchObject({
            taskId: openedTask.task.id,
            runId: openedTask.run.id,
            reason,
        })
    })

    test("ends the session on demand, even with an empty turn", async () => {
        const { taskEnding } = await sendPersonTurn(true)

        expect(taskEnding).toEqual({ state: "done", hasPassedHand: false })
    })

    test("refuses to end the session on a turn that calls tools", async () => {
        await addToolCall("ticket_show", { from: 1 })

        const ending = sendPersonTurn(true)

        await expect(ending).rejects.toThrow("Your turn calls tools")
        const { blocks } = await loadStagedTurn(projectRoot, openedTask.run.id)
        expect(blocks).toHaveLength(1)
    })

    test("refuses an empty turn", async () => {
        const sending = sendPersonTurn()

        await expect(sending).rejects.toThrow(
            "Your turn is empty: add to it with `aico turn add text` or `aico turn add tool`.",
        )
    })
})
