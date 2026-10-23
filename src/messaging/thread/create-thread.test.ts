import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { createGitRepository } from "../../git/create-git-repository.testing.ts"
import { listEvents } from "../../journal/storage.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { assignPositionTemporarily } from "../../organization/position/assign-position-temporarily.ts"
import { savePosition } from "../../organization/position/storage.ts"
import { UserError } from "../../user-error.ts"
import { createExampleWorkCatalog } from "../../work/create-example-work-catalog.testing.ts"
import { listMessages } from "../message/storage.ts"
import { createThread } from "./create-thread.ts"
import { listThreads, loadThread } from "./storage.ts"

const committer = { name: "Test User", email: "test@example.com" }
let environment: NodeJS.ProcessEnv
let projectRoot: string

beforeEach(async () => {
    environment = {}
    projectRoot = await createTemporaryCompany()
    createGitRepository(projectRoot, committer)
    await savePosition(projectRoot, {
        id: "qa-tester",
        title: "QA Tester",
        description: "",
    })
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("createThread", () => {
    test("saves the thread, created by the person at the keyboard", async () => {
        const { thread } = await createThread(projectRoot, environment, {
            subject: "Budget",
        })

        expect(await loadThread(projectRoot, thread.id)).toEqual(thread)
        expect(thread.createdBy).toEqual({
            position: { id: "director", title: "Director" },
            committer,
        })
    })

    test("names the thread after its creation date and subject", async () => {
        const subject = "Choice of framework"

        const { thread } = await createThread(projectRoot, environment, {
            subject,
        })

        const creationDate = thread.createdAt.slice(0, 10)
        expect(thread.id).toBe(`${creationDate}-choice-of-framework`)
    })

    test("writes nothing in the thread without a body", async () => {
        const creation = await createThread(projectRoot, environment, {
            subject: "Budget",
        })

        const messages = await listMessages(projectRoot, creation.thread.id)
        expect(creation.firstMessage).toBeUndefined()
        expect(messages).toEqual([])
        expect(await listEvents(projectRoot)).toEqual([])
    })

    test("sends the body as the thread's first message", async () => {
        const body = "A test plan?"

        const creation = await createThread(projectRoot, environment, {
            subject: "Tests",
            body,
        })

        const messages = await listMessages(projectRoot, creation.thread.id)
        expect(messages).toHaveLength(1)
        expect(messages[0]).toEqual(creation.firstMessage)
        expect(messages[0]).toMatchObject({ body })
    })

    test("records in the journal that a person sent the first message", async () => {
        const creation = await createThread(projectRoot, environment, {
            subject: "Tests",
            body: "A test plan?",
        })

        const messageSentEvent = {
            type: "message-sent",
            depth: 0,
            threadId: creation.thread.id,
            messageId: creation.firstMessage?.id,
        }
        expect((await listEvents(projectRoot)).at(0)).toMatchObject(
            messageSentEvent,
        )
    })

    test("returns the tasks its first message gets from the catalog's listeners", async () => {
        const { thread, createdTasks } = await createThread(
            projectRoot,
            environment,
            { subject: "Tests", body: "A test plan?" },
            createExampleWorkCatalog(["qa-tester"]),
        )

        expect(createdTasks).toMatchObject([
            {
                type: "example",
                positionId: "qa-tester",
                params: { threadId: thread.id },
            },
        ])
    })

    test("writes from the position given, among those the person works", async () => {
        await assignPositionTemporarily(projectRoot, "qa-tester", {
            kind: "directors",
        })

        const { thread } = await createThread(projectRoot, environment, {
            subject: "Tests",
            asPositionId: "qa-tester",
        })

        expect(thread.createdBy.position.id).toBe("qa-tester")
    })

    test("refuses an empty subject", async () => {
        const creation = createThread(projectRoot, environment, {
            subject: "  ",
        })

        await expect(creation).rejects.toThrow(UserError)
        await expect(creation).rejects.toThrow("subject")
        expect(await listThreads(projectRoot)).toEqual([])
    })

    test("refuses a first message it can't send before creating the thread", async () => {
        const creation = createThread(projectRoot, environment, {
            subject: "Tests",
            body: "  \n",
        })

        await expect(creation).rejects.toThrow("The message's body is empty.")
        expect(await listThreads(projectRoot)).toEqual([])
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const creation = createThread(folderWithoutCompany, environment, {
            subject: "Budget",
        })

        await expect(creation).rejects.toThrow("Run `aico init` first.")
    })
})
