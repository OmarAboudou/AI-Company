import { describe, expect, test } from "bun:test"
import { TicketConfigSchema, ticketCreatedEventType } from "./schema.ts"

const frameworkTicket = {
    title: "Choose the API framework",
    requester: { id: "director", title: "Director" },
    assignee: { id: "backend-developer", title: "Backend Developer" },
    committer: { name: "Omar Aboudou", email: "omar@example.com" },
    createdAt: "2026-10-23T14:03:22.123Z",
}

function accepts(config: unknown): boolean {
    return TicketConfigSchema.safeParse(config).success
}

describe("TicketConfigSchema", () => {
    test("accepts a title, its two positions, a committer and a date", () => {
        const parsedTicket = TicketConfigSchema.parse(frameworkTicket)

        expect(parsedTicket).toEqual(frameworkTicket)
    })

    test("accepts the employee who created it", () => {
        const employee = { id: "julie", name: "Julie" }

        expect(accepts({ ...frameworkTicket, employee })).toBe(true)
    })

    test("refuses an empty title", () => {
        expect(accepts({ ...frameworkTicket, title: " " })).toBe(false)
    })

    test("requires its assignee", () => {
        const { assignee, ...unassignedTicket } = frameworkTicket

        expect(accepts(unassignedTicket)).toBe(false)
    })

    test("rejects an unknown key, such as the request", () => {
        expect(accepts({ ...frameworkTicket, request: "Hono?" })).toBe(false)
    })
})

describe("ticketCreatedEventType", () => {
    const ticketCreatedEvent = {
        type: "ticket-created",
        occurredAt: "2026-10-23T14:03:22.123Z",
        depth: 0,
        ticketNumber: 1,
        requesterPositionId: "director",
        assigneePositionId: "backend-developer",
    }

    function isAccepted(event: unknown): boolean {
        return ticketCreatedEventType.recordingSchema.safeParse(event).success
    }

    test("accepts a ticket's number and its two positions", () => {
        expect(isAccepted(ticketCreatedEvent)).toBe(true)
    })

    test("accepts the run in which it was created", () => {
        const runId = "20261023-140324-000-1b2c"

        expect(isAccepted({ ...ticketCreatedEvent, runId })).toBe(true)
    })

    test("refuses a ticket number below 1", () => {
        const zeroTicketEvent = { ...ticketCreatedEvent, ticketNumber: 0 }

        expect(isAccepted(zeroTicketEvent)).toBe(false)
    })
})
