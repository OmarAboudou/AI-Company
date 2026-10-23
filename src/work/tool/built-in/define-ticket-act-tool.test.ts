import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { listEvents, loadJournal } from "../../../journal/storage.ts"
import { createExampleTicket } from "../../../messaging/ticket/create-example-ticket.testing.ts"
import { createTemporaryCompany } from "../../../organization/company/create-temporary-company.testing.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { bindTool } from "../bind-tool.ts"
import type { ToolContext } from "../define-tool.ts"
import { exampleToolContext } from "../example-tool-context.testing.ts"
import { runToolCall } from "../run-tool-call.ts"
import { ticketAnswerTool } from "./ticket/answer.ts"
import { ticketAskTool } from "./ticket/ask.ts"

let projectRoot: string
let ticketNumber: number

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await createPosition(projectRoot, "backend-developer", {
        title: "Backend Developer",
        description: "",
    })
    const ticket = await createExampleTicket(projectRoot, {
        rawAssigneePositionId: "backend-developer",
    })
    ticketNumber = ticket.number
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const tools = { ticket_ask: ticketAskTool, ticket_answer: ticketAnswerTool }

async function callTool(name: keyof typeof tools, body: string) {
    const ctx: ToolContext = {
        ...exampleToolContext,
        projectRoot,
        journal: await loadJournal(projectRoot),
    }
    const call = { name, input: { ticketNumber, body } }
    return runToolCall(tools, call, ctx)
}

describe("a ticket's act as a tool", () => {
    test("acts from the run's position, saying which message it wrote", async () => {
        const result = await callTool("ticket_ask", "Hono or Express?")

        expect(result).toEqual({
            text: `Question asked, as message #1 of ticket #${ticketNumber}.`,
            isError: false,
            hasPassedHand: true,
        })
        expect((await listEvents(projectRoot)).at(-1)).toMatchObject({
            type: "ticket-question-asked",
            positionId: "backend-developer",
            runId: exampleToolContext.runId,
        })
    })

    test("gives back why it refuses an act, for the caller to act otherwise", async () => {
        const result = await callTool("ticket_answer", "Hono.")

        const refusalMessage = `You can't answer the question on ticket #${ticketNumber}: only its requester, @founder, can.`
        expect(result.isError).toBe(true)
        expect(result.text).toBe(refusalMessage)
    })

    test("speaks of this ticket once the task fixes its ticket", () => {
        const { description } = bindTool(ticketAskTool, { ticketNumber })

        expect(description).toStartWith("Ask the requester of this ticket")
    })
})
