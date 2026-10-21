import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { createGitRepository } from "../../../../git/create-git-repository.testing.ts"
import { sendMessage } from "../../../../messaging/message/send-message.ts"
import { createThread } from "../../../../messaging/thread/create-thread.ts"
import { createTemporaryCompany } from "../../../../organization/company/create-temporary-company.testing.ts"
import { bindTool } from "../../bind-tool.ts"
import { exampleToolContext } from "../../example-tool-context.testing.ts"
import { runToolCall } from "../../run-tool-call.ts"
import { maxEntriesPerCall, threadShowTool } from "./show.ts"

let environment: NodeJS.ProcessEnv
let projectRoot: string
let threadId: string

beforeEach(async () => {
    environment = {}
    projectRoot = await createTemporaryCompany()
    createGitRepository(projectRoot, {
        name: "Omar Aboudou",
        email: "omar@example.com",
    })
    const { thread } = await createThread(projectRoot, environment, {
        subject: "Stack",
    })
    threadId = thread.id
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function sendMessages(count: number): Promise<void> {
    for (let number = 1; number <= count; number++) {
        await sendMessage(projectRoot, environment, threadId, {
            body: `Point ${number}.`,
        })
    }
}

const tools = { thread_show: threadShowTool }

function callThreadShow(input: object) {
    const ctx = { ...exampleToolContext, projectRoot }
    const call = { name: "thread_show", input: { threadId, ...input } }
    return runToolCall(tools, call, ctx)
}

describe("thread_show", () => {
    test("shows the entries from one number to another, numbered", async () => {
        await sendMessages(3)

        const result = await callThreadShow({ from: 2, to: 3 })

        const headerLine = `Entries #2 to #3 of the thread "Stack" (${threadId}), which has 3:`
        expect(result.text).toStartWith(`${headerLine}\n\n<message number="2"`)
        expect(result.text).toContain('<message number="3"')
        expect(result.text).not.toContain('number="1"')
    })

    test("shows the entries up to the thread's last without a to", async () => {
        await sendMessages(3)

        const result = await callThreadShow({ from: 3 })

        expect(result.text).toStartWith("Entry #3 of the thread")
        expect(result.text).toContain("Point 3.")
    })

    test("shows a limited number of entries, then says how to go on", async () => {
        await sendMessages(maxEntriesPerCall + 2)

        const result = await callThreadShow({ from: 2 })

        const lastShownNumber = maxEntriesPerCall + 1
        const nextNumber = lastShownNumber + 1
        const nextCallLine = `call thread_show again from ${nextNumber} for the next ones.`
        expect(result.text).toStartWith(`Entries #2 to #${lastShownNumber}`)
        expect(result.text).not.toContain(`number="${nextNumber}"`)
        expect(result.text).toEndWith(nextCallLine)
    })

    test("refuses a from beyond the thread's last entry", async () => {
        await sendMessages(1)

        const result = await callThreadShow({ from: 2 })

        expect(result).toEqual({
            text: `Thread ${threadId} has 1 entry: give a from between 1 and 1.`,
            isError: true,
        })
    })

    test("refuses a to before the from", async () => {
        await sendMessages(3)

        const result = await callThreadShow({ from: 3, to: 2 })

        expect(result).toEqual({
            text: "to comes before from: give a to of 3 or more.",
            isError: true,
        })
    })

    test("refuses to show a thread without entries", async () => {
        const result = await callThreadShow({ from: 1 })

        expect(result).toEqual({
            text: `Thread ${threadId} has no entries yet.`,
            isError: true,
        })
    })

    test("speaks of this thread once the task fixes its thread", () => {
        const { description } = bindTool(threadShowTool, { threadId })

        expect(description).toStartWith("Show this thread's entries")
    })
})
