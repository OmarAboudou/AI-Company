import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { createGitRepository } from "../../git/create-git-repository.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.ts"
import { saveEmployee } from "../../organization/employee/storage.ts"
import { assignPositionTemporarily } from "../../organization/position/assign-position-temporarily.ts"
import { savePosition } from "../../organization/position/storage.ts"
import { UserError } from "../../user-error.ts"
import { createThread } from "../thread/create-thread.ts"
import { sendMessage } from "./send-message.ts"
import { listMessages } from "./storage.ts"

const variableName = "LLMCO_CURRENT_HUMAN_ID"
const shellValue = process.env[variableName]
const committer = { name: "Test User", email: "test@example.com" }
let projectRoot: string
let threadId: string

beforeEach(async () => {
    delete process.env[variableName]
    projectRoot = await createTemporaryCompany()
    createGitRepository(projectRoot, committer)
    await savePosition(projectRoot, {
        id: "qa-tester",
        title: "QA Tester",
        description: "",
    })
    const { thread } = await createThread(projectRoot, { subject: "Budget" })
    threadId = thread.id
})

afterEach(async () => {
    if (shellValue === undefined) {
        delete process.env[variableName]
    } else {
        process.env[variableName] = shellValue
    }
    await rm(projectRoot, { recursive: true, force: true })
})

async function listBodies(): Promise<string[]> {
    const messages = await listMessages(projectRoot, threadId)
    return messages.map(({ body }) => body)
}

describe("sendMessage", () => {
    test("adds the message at the end of the thread", async () => {
        await sendMessage(projectRoot, threadId, { body: "First." })

        const { message } = await sendMessage(projectRoot, threadId, {
            body: "Second.",
        })

        const messages = await listMessages(projectRoot, threadId)
        expect(await listBodies()).toEqual(["First.", "Second."])
        expect(messages.at(-1)).toEqual(message)
    })

    test("records its author and the positions it mentions", async () => {
        const body = "@qa-tester, a test plan?"

        const { message } = await sendMessage(projectRoot, threadId, { body })

        expect(message).toMatchObject({
            position: { id: "director", title: "Director" },
            committer,
            mentions: ["qa-tester"],
        })
        expect(message.employee).toBeUndefined()
    })

    test("returns the mentions that name no position", async () => {
        const body = "@qa-testers, a test plan?"

        const sending = await sendMessage(projectRoot, threadId, { body })

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
        process.env[variableName] = "julie"
        const { thread } = await createThread(projectRoot, {
            subject: "Logo",
            body: "@qa-tester, is the logo broken?",
        })
        delete process.env[variableName]

        const { message } = await sendMessage(projectRoot, thread.id, {
            body: "It is.",
        })

        expect(thread.createdBy.position.id).toBe("graphics")
        expect(message.position.id).toBe("qa-tester")
    })

    test("refuses a message it can't send, and sends nothing", async () => {
        const body = "@qa-tester:claude-senior, a review?"

        const sending = sendMessage(projectRoot, threadId, { body })

        await expect(sending).rejects.toThrow(UserError)
        await expect(sending).rejects.toThrow("Mentioning a specific employee")
        expect(await listBodies()).toEqual([])
    })

    test("refuses an unknown thread", async () => {
        const sending = sendMessage(projectRoot, "2026-10-18-nothing", {
            body: "Hi",
        })

        await expect(sending).rejects.toThrow('No thread "2026-10-18-nothing".')
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const sending = sendMessage(folderWithoutCompany, threadId, {
            body: "Hi",
        })

        await expect(sending).rejects.toThrow("Run `llmco init` first.")
    })
})
