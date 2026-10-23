import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Ticket } from "./schema.ts"
import {
    hasTicket,
    listTicketNumbers,
    listTickets,
    loadTicket,
    saveNewTicket,
} from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "aico-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const frameworkTicket: Ticket = {
    number: 2,
    title: "Choose the API framework",
    requester: { id: "director", title: "Director" },
    assignee: { id: "backend-developer", title: "Backend Developer" },
    committer: { name: "Omar Aboudou", email: "omar@example.com" },
    createdAt: "2026-10-23T14:03:22.123Z",
    request: "Hono or Express?",
}

function getTicketFolderPath(number: number): string {
    return join(projectRoot, ".aico", "tickets", String(number))
}

describe("saveNewTicket and loadTicket", () => {
    test("write ticket.json and request.md, then read them back", async () => {
        await saveNewTicket(projectRoot, frameworkTicket)

        const folderPath = getTicketFolderPath(2)
        const config = await Bun.file(join(folderPath, "ticket.json")).json()
        const request = await Bun.file(join(folderPath, "request.md")).text()

        expect(config.title).toBe("Choose the API framework")
        expect(request).toBe("Hono or Express?")
        expect(await loadTicket(projectRoot, 2)).toEqual(frameworkTicket)
    })

    test("refuse to write a ticket over another of the same number", async () => {
        await saveNewTicket(projectRoot, frameworkTicket)
        const otherTicket = { ...frameworkTicket, title: "Choose the database" }

        const saving = saveNewTicket(projectRoot, otherTicket)

        await expect(saving).rejects.toThrow()
        const { title } = await loadTicket(projectRoot, 2)
        expect(title).toBe("Choose the API framework")
    })
})

describe("hasTicket", () => {
    test("tells whether a ticket of that number exists", async () => {
        await saveNewTicket(projectRoot, frameworkTicket)

        expect(await hasTicket(projectRoot, 2)).toBe(true)
        expect(await hasTicket(projectRoot, 3)).toBe(false)
    })
})

describe("listTicketNumbers and listTickets", () => {
    test("are empty when no ticket was ever created", async () => {
        expect(await listTicketNumbers(projectRoot)).toEqual([])
        expect(await listTickets(projectRoot)).toEqual([])
    })

    test("return the tickets in the order of their numbers", async () => {
        const tickets = [10, 2, 9].map((number) => ({
            ...frameworkTicket,
            number,
        }))
        for (const ticket of tickets) {
            await saveNewTicket(projectRoot, ticket)
        }

        const ticketNumbers = await listTicketNumbers(projectRoot)
        const listedTickets = await listTickets(projectRoot)

        expect(ticketNumbers).toEqual([2, 9, 10])
        expect(listedTickets.map(({ number }) => number)).toEqual([2, 9, 10])
    })

    test("pass over folders that aren't named after a number", async () => {
        await saveNewTicket(projectRoot, frameworkTicket)
        await Bun.write(join(projectRoot, ".aico", "tickets", "notes", "a"), "")

        expect(await listTicketNumbers(projectRoot)).toEqual([2])
    })
})
