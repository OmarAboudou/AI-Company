import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { listEvents, loadJournal } from "../../../../journal/storage.ts"
import { listTickets } from "../../../../messaging/ticket/storage.ts"
import { createTemporaryCompany } from "../../../../organization/company/create-temporary-company.testing.ts"
import { createPosition } from "../../../../organization/position/create-position.ts"
import type { ToolContext } from "../../define-tool.ts"
import { exampleToolContext } from "../../example-tool-context.testing.ts"
import { runToolCall } from "../../run-tool-call.ts"
import { ticketCreateTool } from "./create.ts"

let projectRoot: string
let ctx: ToolContext

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await createPosition(projectRoot, "backend-developer", {
        title: "Backend Developer",
        description: "",
    })
    ctx = {
        ...exampleToolContext,
        projectRoot,
        journal: await loadJournal(projectRoot),
        position: { id: "director", title: "Director", description: "" },
        worker: { kind: "directors" },
    }
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const frameworkInput = {
    title: "Choose the API framework",
    request: "Hono or Express?",
    assigneePositionId: "backend-developer",
}

function callTicketCreate(input: unknown, callCtx = ctx) {
    const tools = { ticket_create: ticketCreateTool }
    return runToolCall(tools, { name: "ticket_create", input }, callCtx)
}

describe("ticket_create", () => {
    test("creates the ticket from the run's position", async () => {
        const result = await callTicketCreate(frameworkInput)

        const [ticket] = await listTickets(projectRoot)
        expect(result).toEqual({
            text: "Created ticket #1, for @backend-developer.",
            isError: false,
        })
        expect(ticket).toMatchObject({
            title: "Choose the API framework",
            requester: { id: "director" },
            assignee: { id: "backend-developer" },
            request: "Hono or Express?",
        })
    })

    test("records the creation at the task's depth, with its run", async () => {
        await callTicketCreate(frameworkInput)

        expect((await listEvents(projectRoot)).at(-1)).toMatchObject({
            type: "ticket-created",
            depth: ctx.depth,
            runId: ctx.runId,
        })
    })

    test("refuses a ticket from another position than the director's", async () => {
        const developerCtx: ToolContext = {
            ...ctx,
            position: exampleToolContext.position,
        }

        const result = await callTicketCreate(frameworkInput, developerCtx)

        expect(result.isError).toBe(true)
        expect(result.text).toStartWith("Only the director creates tickets")
        expect(await listTickets(projectRoot)).toEqual([])
    })
})
