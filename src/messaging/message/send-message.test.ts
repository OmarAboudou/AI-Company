import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { createGitRepository } from "../../git/create-git-repository.testing.ts"
import { listEvents } from "../../journal/storage.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { saveEmployee } from "../../organization/employee/storage.ts"
import { assignPositionTemporarily } from "../../organization/position/assign-position-temporarily.ts"
import { savePosition } from "../../organization/position/storage.ts"
import { UserError } from "../../user-error.ts"
import { createExampleWorkCatalog } from "../../work/create-example-work-catalog.testing.ts"
import { listTasks } from "../../work/task/storage.ts"
import { createThread } from "../thread/create-thread.ts"
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

        const { message } = await sendInThread("A test plan?")

        const messageSentEvent = {
            type: "message-sent",
            depth: 0,
            threadId,
            messageId: message.id,
            positionId: "director",
        }
        expect(before).toEqual([])
        expect((await listEvents(projectRoot)).at(0)).toMatchObject(
            messageSentEvent,
        )
    })

    test("returns the tasks its catalog's listeners create", async () => {
        const catalog = createExampleWorkCatalog(["qa-tester"])

        const { createdTasks } = await sendMessage(
            projectRoot,
            environment,
            threadId,
            { body: "A test plan?" },
            catalog,
        )

        expect(createdTasks).toMatchObject([
            { type: "example", positionId: "qa-tester", params: { threadId } },
        ])
        expect(await listTasks(projectRoot)).toEqual(createdTasks)
    })

    test("records its author", async () => {
        const { message } = await sendInThread("A test plan?")

        expect(message).toMatchObject({
            position: { id: "director", title: "Director" },
            committer,
        })
        expect(message.employee).toBeUndefined()
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
        environment.AICO_CURRENT_HUMAN_ID = "julie"
        const { thread } = await createThread(projectRoot, environment, {
            subject: "Logo",
            body: "Is the logo broken?",
        })
        delete environment.AICO_CURRENT_HUMAN_ID
        await sendMessage(projectRoot, environment, thread.id, {
            body: "Checking.",
            asPositionId: "qa-tester",
        })

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
        const sending = sendInThread("  \n")

        await expect(sending).rejects.toThrow(UserError)
        await expect(sending).rejects.toThrow("The message's body is empty.")
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

        await expect(sending).rejects.toThrow("Run `aico init` first.")
    })
})
