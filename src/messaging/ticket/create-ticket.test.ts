import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { listEvents, loadJournal } from "../../journal/storage.ts"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { createPosition } from "../../organization/position/create-position.ts"
import { UserError } from "../../user-error.ts"
import type { Author } from "../message/schema.ts"
import { createTicket, type TicketToCreate } from "./create-ticket.ts"
import { listTickets, loadTicket } from "./storage.ts"

const director: Author = {
    position: { id: "director", title: "Director" },
    committer: { name: "Omar Aboudou", email: "omar@example.com" },
}

const frameworkRequest: TicketToCreate = {
    title: "Choose the API framework",
    request: "Hono or Express?",
    rawAssigneePositionId: "backend-developer",
}

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await createPosition(projectRoot, "backend-developer", {
        title: "Backend Developer",
        description: "",
    })
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function createFrameworkTicket(ticketToCreate = frameworkRequest) {
    const journal = await loadJournal(projectRoot)
    return createTicket(journal, director, ticketToCreate, { depth: 0 })
}

describe("createTicket", () => {
    test("saves a request from the author's position to the assignee", async () => {
        const ticket = await createFrameworkTicket()

        expect(await loadTicket(projectRoot, ticket.number)).toEqual(ticket)
        expect(ticket).toMatchObject({
            number: 1,
            title: "Choose the API framework",
            requester: { id: "director", title: "Director" },
            assignee: { id: "backend-developer", title: "Backend Developer" },
            committer: director.committer,
            request: "Hono or Express?",
        })
    })

    test("numbers tickets in sequence", async () => {
        const firstTicket = await createFrameworkTicket()

        const secondTicket = await createFrameworkTicket({
            ...frameworkRequest,
            title: "Choose the database",
        })

        expect(firstTicket.number).toBe(1)
        expect(secondTicket.number).toBe(2)
    })

    test("records in the journal that the ticket was created", async () => {
        const ticket = await createFrameworkTicket()

        expect(await listEvents(projectRoot)).toMatchObject([
            {
                type: "ticket-created",
                depth: 0,
                ticketNumber: ticket.number,
                requesterPositionId: "director",
                assigneePositionId: "backend-developer",
            },
        ])
    })

    test("lets a position address a ticket to itself", async () => {
        const ticket = await createFrameworkTicket({
            ...frameworkRequest,
            rawAssigneePositionId: "director",
        })

        expect(ticket.assignee).toEqual(ticket.requester)
    })

    test("refuses an assignee that isn't a position", async () => {
        const creation = createFrameworkTicket({
            ...frameworkRequest,
            rawAssigneePositionId: "designer",
        })

        await expect(creation).rejects.toThrow(UserError)
        await expect(creation).rejects.toThrow('No position "designer"')
        expect(await listTickets(projectRoot)).toEqual([])
    })

    test("refuses an empty title", async () => {
        const creation = createFrameworkTicket({
            ...frameworkRequest,
            title: " ",
        })

        await expect(creation).rejects.toThrow(UserError)
        await expect(creation).rejects.toThrow("title")
        expect(await listTickets(projectRoot)).toEqual([])
    })

    test("refuses an empty request", async () => {
        const creation = createFrameworkTicket({
            ...frameworkRequest,
            request: "\n",
        })

        await expect(creation).rejects.toThrow("request is empty")
        expect(await listTickets(projectRoot)).toEqual([])
    })
})
