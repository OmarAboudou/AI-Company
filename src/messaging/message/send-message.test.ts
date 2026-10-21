import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { createGitRepository } from "../../git/create-git-repository.testing.ts"
import { recordEvent } from "../../journal/record-event.ts"
import { listEvents, loadJournal } from "../../journal/storage.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { saveEmployee } from "../../organization/employee/storage.ts"
import { assignPositionTemporarily } from "../../organization/position/assign-position-temporarily.ts"
import { savePosition } from "../../organization/position/storage.ts"
import { UserError } from "../../user-error.ts"
import { listTasks } from "../../work/task/storage.ts"
import { createThread } from "../thread/create-thread.ts"
import { messageSentEventType } from "./schema.ts"
import { sendMessage } from "./send-message.ts"
import { listMessages } from "./storage.ts"

const committer = { name: "Test User", email: "test@example.com" }
let environment: NodeJS.ProcessEnv
let projectRoot: string
let threadId: string

beforeEach(async () => {
    environment = {}
    projectRoot = await createTemporaryCompany()
    createGitRepository(projectRoot, committer)
    await savePosition(projectRoot, {
        id: "qa-tester",
        title: "QA Tester",
        description: "",
    })
    const { thread } = await createThread(projectRoot, environment, {
        subject: "Budget",
    })
    threadId = thread.id
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function sendInThread(body: string) {
    return sendMessage(projectRoot, environment, threadId, { body })
}

async function listBodies(): Promise<string[]> {
    const messages = await listMessages(projectRoot, threadId)
    return messages.map(({ body }) => body)
}

describe("sendMessage", () => {
    test("adds the message at the end of the thread", async () => {
        await sendInThread("First.")

        const { message } = await sendInThread("Second.")

        const messages = await listMessages(projectRoot, threadId)
        expect(await listBodies()).toEqual(["First.", "Second."])
        expect(messages.at(-1)).toEqual(message)
    })

    test("records in the journal that a person sent it, at depth 0", async () => {
        const before = await listEvents(projectRoot)

        const { message } = await sendInThread("@qa-tester, a test plan?")

        const messageSentEvent = {
            type: "message-sent",
            depth: 0,
            threadId,
            messageId: message.id,
            positionId: "director",
            mentions: ["qa-tester"],
        }
        expect(before).toEqual([])
        expect((await listEvents(projectRoot)).at(0)).toMatchObject(
            messageSentEvent,
        )
    })

    test("asks each position it mentions, with a task", async () => {
        const body = "@qa-tester, a test plan?"

        const { createdTasks } = await sendInThread(body)

        expect(createdTasks).toMatchObject([
            {
                type: "catch-up-thread",
                positionId: "qa-tester",
                params: { threadId },
            },
        ])
    })

    test("marks as done what earlier messages asked of its position", async () => {
        await recordEvent(
            await loadJournal(projectRoot),
            messageSentEventType,
            {
                depth: 1,
                threadId,
                messageId: "20261018-140322-123-3f9a",
                positionId: "backend-developer",
                mentions: ["director"],
            },
        )

        const { message } = await sendInThread("Hono.")

        const [tasks, events] = await Promise.all([
            listTasks(projectRoot),
            listEvents(projectRoot),
        ])
        const directorCatchUp = tasks.find(
            ({ positionId }) => positionId === "director",
        )
        expect(events.at(-1)).toMatchObject({
            type: "task-done",
            taskId: directorCatchUp?.id,
            result: { lastReadEntryId: message.id },
        })
    })

    test("records its author and the positions it mentions", async () => {
        const body = "@qa-tester, a test plan?"

        const { message } = await sendInThread(body)

        expect(message).toMatchObject({
            position: { id: "director", title: "Director" },
            committer,
            mentions: ["qa-tester"],
        })
        expect(message.employee).toBeUndefined()
    })

    test("returns the mentions that name no position", async () => {
        const body = "@qa-testers, a test plan?"

        const sending = await sendInThread(body)

        expect(sending.unknownMentionIds).toEqual(["qa-testers"])
        expect(sending.message.mentions).toEqual([])
    })

    test("writes from the author's only position in the thread", async () => {
        await saveEmployee(projectRoot, {
            id: "julie",
            name: "Julie",
            kind: "human",
        })
        await savePosition(projectRoot, {
            id: "graphics",
            title: "Graphics",
            description: "",
            defaultEmployeeId: "julie",
        })
        await assignPositionTemporarily(projectRoot, "qa-tester", {
            kind: "directors",
        })
        environment.LLMCO_CURRENT_HUMAN_ID = "julie"
        const { thread } = await createThread(projectRoot, environment, {
            subject: "Logo",
            body: "@qa-tester, is the logo broken?",
        })
        delete environment.LLMCO_CURRENT_HUMAN_ID

        const { message } = await sendMessage(
            projectRoot,
            environment,
            thread.id,
            {
                body: "It is.",
            },
        )

        expect(thread.createdBy.position.id).toBe("graphics")
        expect(message.position.id).toBe("qa-tester")
    })

    test("refuses a message it can't send, and sends nothing", async () => {
        const body = "@qa-tester:claude-senior, a review?"

        const sending = sendInThread(body)

        await expect(sending).rejects.toThrow(UserError)
        await expect(sending).rejects.toThrow("Mentioning a specific employee")
        expect(await listBodies()).toEqual([])
        expect(await listEvents(projectRoot)).toEqual([])
    })

    test("refuses an unknown thread", async () => {
        const sending = sendMessage(
            projectRoot,
            environment,
            "2026-10-18-nothing",
            {
                body: "Hi",
            },
        )

        await expect(sending).rejects.toThrow('No thread "2026-10-18-nothing".')
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const sending = sendMessage(
            folderWithoutCompany,
            environment,
            threadId,
            {
                body: "Hi",
            },
        )

        await expect(sending).rejects.toThrow("Run `llmco init` first.")
    })
})
