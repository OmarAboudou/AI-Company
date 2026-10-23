import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { createGitRepository } from "../../../../git/create-git-repository.testing.ts"
import { createExampleTicket } from "../../../../messaging/ticket/create-example-ticket.testing.ts"
import { createTemporaryCompany } from "../../../../organization/company/create-temporary-company.testing.ts"
import { createExampleWorkCatalog } from "../../../create-example-work-catalog.testing.ts"
import { sendExampleMessage } from "../../../send-example-message.testing.ts"
import { bindTool } from "../../bind-tool.ts"
import { exampleToolContext } from "../../example-tool-context.testing.ts"
import { runToolCall } from "../../run-tool-call.ts"
import { maxMessagesPerCall, ticketShowTool } from "./show.ts"

let projectRoot: string
let ticketNumber: number

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    createGitRepository(projectRoot, {
        name: "Omar Aboudou",
        email: "omar@example.com",
    })
    const ticket = await createExampleTicket(projectRoot, { title: "Stack" })
    ticketNumber = ticket.number
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function sendMessages(count: number): Promise<void> {
    for (let number = 1; number <= count; number++) {
        await sendExampleMessage(
            projectRoot,
            ticketNumber,
            `Point ${number}.`,
            createExampleWorkCatalog(),
        )
    }
}

const tools = { ticket_show: ticketShowTool }

function callTicketShow(input: object) {
    const ctx = { ...exampleToolContext, projectRoot }
    const call = { name: "ticket_show", input: { ticketNumber, ...input } }
    return runToolCall(tools, call, ctx)
}

describe("ticket_show", () => {
    test("shows the messages from one number to another, numbered", async () => {
        await sendMessages(3)

        const result = await callTicketShow({ from: 2, to: 3 })

        const headerLine = `Messages #2 to #3 of ticket #${ticketNumber}, "Stack", which has 3:`
        expect(result.text).toStartWith(`${headerLine}\n\n<message number="2"`)
        expect(result.text).toContain('<message number="3"')
        expect(result.text).not.toContain('number="1"')
    })

    test("shows the messages up to the discussion's last without a to", async () => {
        await sendMessages(3)

        const result = await callTicketShow({ from: 3 })

        expect(result.text).toStartWith(`Message #3 of ticket #${ticketNumber}`)
        expect(result.text).toContain("Point 3.")
    })

    test("shows a limited number of messages, then says how to go on", async () => {
        await sendMessages(maxMessagesPerCall + 2)

        const result = await callTicketShow({ from: 2 })

        const lastShownNumber = maxMessagesPerCall + 1
        const nextNumber = lastShownNumber + 1
        const nextCallLine = `call ticket_show again from ${nextNumber} for the next ones.`
        expect(result.text).toStartWith(`Messages #2 to #${lastShownNumber}`)
        expect(result.text).not.toContain(`number="${nextNumber}"`)
        expect(result.text).toEndWith(nextCallLine)
    })

    test("refuses a from beyond the discussion's last message", async () => {
        await sendMessages(1)

        const result = await callTicketShow({ from: 2 })

        expect(result).toEqual({
            text: `Ticket #${ticketNumber} has 1 message: give a from between 1 and 1.`,
            isError: true,
        })
    })

    test("refuses a to before the from", async () => {
        await sendMessages(3)

        const result = await callTicketShow({ from: 3, to: 2 })

        expect(result).toEqual({
            text: "to comes before from: give a to of 3 or more.",
            isError: true,
        })
    })

    test("refuses to show a discussion without messages", async () => {
        const result = await callTicketShow({ from: 1 })

        expect(result).toEqual({
            text: `Ticket #${ticketNumber} has no messages yet.`,
            isError: true,
        })
    })

    test("speaks of this ticket once the task fixes its ticket", () => {
        const { description } = bindTool(ticketShowTool, { ticketNumber })

        expect(description).toStartWith("Show this ticket's discussion")
    })
})
