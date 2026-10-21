import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { listEvents, loadJournal } from "../../../../journal/storage.ts"
import { listMessages } from "../../../../messaging/message/storage.ts"
import { loadEmployee } from "../../../../organization/employee/storage.ts"
import { loadPosition } from "../../../../organization/position/storage.ts"
import { createCompanyWithLlmEmployee } from "../../../create-company-with-llm-employee.testing.ts"
import { bindTool } from "../../bind-tool.ts"
import type { ToolContext } from "../../define-tool.ts"
import { exampleToolContext } from "../../example-tool-context.testing.ts"
import { runToolCall } from "../../run-tool-call.ts"
import { messageSendTool } from "./send.ts"

let projectRoot: string
let threadId: string
let ctx: ToolContext

beforeEach(async () => {
    const companyWithLlmEmployee =
        await createCompanyWithLlmEmployee("http://127.0.0.1")
    projectRoot = companyWithLlmEmployee.projectRoot
    threadId = companyWithLlmEmployee.threadId
    const [position, employee, journal] = await Promise.all([
        loadPosition(projectRoot, "backend-developer"),
        loadEmployee(projectRoot, "claude"),
        loadJournal(projectRoot),
    ])
    ctx = {
        ...exampleToolContext,
        projectRoot,
        journal,
        taskDepth: 3,
        position,
        employee,
    }
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const tools = { message_send: messageSendTool }

function callMessageSend(input: unknown) {
    return runToolCall(tools, { name: "message_send", input }, ctx)
}

describe("message_send", () => {
    test("sends the message as the run's position and employee", async () => {
        const body = "@qa-tester Hono is in, can you test it?"

        await callMessageSend({ threadId, body })

        const [message] = await listMessages(projectRoot, threadId)
        expect(message).toMatchObject({
            position: { id: "backend-developer", title: "backend-developer" },
            employee: { id: "claude", name: "Claude Senior" },
            mentions: ["qa-tester"],
            body,
        })
    })

    test("records it at the task's depth, with the run that sent it", async () => {
        await callMessageSend({ threadId, body: "@qa-tester Ready." })

        const [message] = await listMessages(projectRoot, threadId)
        expect(await listEvents(projectRoot)).toMatchObject([
            {
                type: "message-sent",
                depth: 3,
                messageId: message?.id,
                runId: ctx.runId,
            },
        ])
    })

    test("says which entry of the thread the message became", async () => {
        await callMessageSend({ threadId, body: "Hono." })

        const result = await callMessageSend({ threadId, body: "For Bun." })

        expect(result).toEqual({
            text: `Sent as entry #2 of thread ${threadId}.`,
            isError: false,
        })
    })

    test("warns of a mention that names no position", async () => {
        const body = "@qa Can you test it?"

        const result = await callMessageSend({ threadId, body })

        expect(result.text).toContain('"@qa" names no position')
    })

    test("refuses an unknown thread, and sends nothing", async () => {
        const result = await callMessageSend({
            threadId: "2026-10-18-other",
            body: "Hono.",
        })

        expect(result).toEqual({
            text: 'No thread "2026-10-18-other". Run `llmco thread list`.',
            isError: true,
        })
        expect(await listEvents(projectRoot)).toEqual([])
    })

    test("refuses an empty message", async () => {
        const result = await callMessageSend({ threadId, body: " " })

        expect(result).toEqual({
            text: "The message's body is empty.",
            isError: true,
        })
    })

    test("speaks of this thread once the task fixes its thread", () => {
        const { description } = bindTool(messageSendTool, { threadId })

        expect(description).toStartWith("Send a message in this thread,")
    })
})
