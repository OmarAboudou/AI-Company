import { describe, expect, test } from "bun:test"
import { getTicketStates } from "./get-ticket-states.ts"
import type { Ticket } from "./schema.ts"

const frameworkTicket: Ticket = {
    number: 1,
    title: "Choose the API framework",
    requester: { id: "director", title: "Director" },
    assignee: { id: "developer", title: "Developer" },
    committer: { name: "Omar Aboudou", email: "omar@example.com" },
    createdAt: "2026-10-23T14:00:00.000Z",
    request: "Hono or Express?",
}

describe("getTicketStates", () => {
    test("opens each ticket, its assignee having the hand", () => {
        const ticketStates = getTicketStates([frameworkTicket], [], [])

        expect(ticketStates).toEqual(
            new Map([
                [
                    1,
                    {
                        status: "open",
                        requesterPositionId: "director",
                        assigneePositionId: "developer",
                    },
                ],
            ]),
        )
    })

    test("follows each ticket's own acts, as the journal records them", () => {
        const otherTicket = { ...frameworkTicket, number: 2 }
        const questionAsked = {
            id: "20261023-141000-000-0a01",
            type: "ticket-question-asked",
            occurredAt: "2026-10-23T14:10:00.000Z",
            depth: 1,
            ticketNumber: 2,
            messageId: "20261023-141000-000-3f9a",
            positionId: "developer",
        }

        const ticketStates = getTicketStates(
            [frameworkTicket, otherTicket],
            [questionAsked],
            [],
        )

        expect(ticketStates.get(1)?.status).toBe("open")
        expect(ticketStates.get(2)?.status).toBe("waiting")
    })

    test("names its positions as they are called now", () => {
        const renamedDeveloper = {
            id: "backend-developer",
            formerIds: [{ id: "developer", until: "2026-10-23T15:00:00.000Z" }],
        }

        const ticketStates = getTicketStates(
            [frameworkTicket],
            [],
            [renamedDeveloper],
        )

        const assigneeId = ticketStates.get(1)?.assigneePositionId
        expect(assigneeId).toBe("backend-developer")
    })
})
