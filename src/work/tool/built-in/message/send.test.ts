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
let ticketNumber: number
let ctx: ToolContext

beforeEach(async () => {
    const companyWithLlmEmployee =
        await createCompanyWithLlmEmployee("http://127.0.0.1")
    projectRoot = companyWithLlmEmployee.projectRoot
    ticketNumber = companyWithLlmEmployee.ticketNumber
    const [position, employee, journal] = await Promise.all([
        loadPosition(projectRoot, "backend-developer"),
        loadEmployee(projectRoot, "claude"),
        loadJournal(projectRoot),
    ])
    ctx = {
        ...exampleToolContext,
        projectRoot,
        journal,
        depth: 3,
        position,
        worker: { kind: "employee", employee },
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
        const body = "Hono is in, can you test it?"

        await callMessageSend({ ticketNumber, body })

        const [message] = await listMessages(projectRoot, ticketNumber)
        expect(message).toMatchObject({
            position: { id: "backend-developer", title: "backend-developer" },
            employee: { id: "claude", name: "Claude Senior" },
            body,
        })
    })

    test("sends the message as a director, without an employee, when the directors work the task", async () => {
        const directorsCtx: ToolContext = {
            ...ctx,
            worker: { kind: "directors" },
        }
        const call = {
            name: "message_send",
            input: { ticketNumber, body: "Hi." },
        }

        await runToolCall(tools, call, directorsCtx)

        const [message] = await listMessages(projectRoot, ticketNumber)
        expect(message).not.toHaveProperty("employee")
        expect(message?.committer).toEqual({
            name: "Test User",
            email: "test@example.com",
        })
    })

    test("records it at the task's depth, with the run that sent it", async () => {
        await callMessageSend({ ticketNumber, body: "Ready." })

        const [message] = await listMessages(projectRoot, ticketNumber)
        expect((await listEvents(projectRoot)).at(-1)).toMatchObject({
            type: "message-sent",
            depth: 3,
            ticketNumber,
            messageId: message?.id,
            runId: ctx.runId,
        })
    })

    test("says which message of the discussion it became", async () => {
        await callMessageSend({ ticketNumber, body: "Hono." })

        const result = await callMessageSend({ ticketNumber, body: "For Bun." })

        expect(result).toEqual({
            text: `Sent as message #2 of ticket #${ticketNumber}.`,
            isError: false,
        })
    })

    test("refuses an unknown ticket, and sends nothing", async () => {
        const eventsBefore = await listEvents(projectRoot)

        const result = await callMessageSend({ ticketNumber: 9, body: "Hono." })

        expect(result).toEqual({
            text: "No ticket #9. Run `aico ticket list`.",
            isError: true,
        })
        expect(await listEvents(projectRoot)).toEqual(eventsBefore)
    })

    test("refuses an empty message", async () => {
        const result = await callMessageSend({ ticketNumber, body: " " })

        expect(result).toEqual({
            text: "The message's body is empty.",
            isError: true,
        })
    })

    test("speaks of this ticket once the task fixes its ticket", () => {
        const { description } = bindTool(messageSendTool, { ticketNumber })

        expect(description).toStartWith("Send a message in this ticket's")
    })
})
