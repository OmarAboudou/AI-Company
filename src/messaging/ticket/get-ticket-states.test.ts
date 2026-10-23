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
        const ticketStates = getTicketStates([frameworkTicket], [])

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

    test("names its positions as they are called now", () => {
        const renamedDeveloper = {
            id: "backend-developer",
            formerIds: [{ id: "developer", until: "2026-10-23T15:00:00.000Z" }],
        }

        const ticketStates = getTicketStates(
            [frameworkTicket],
            [renamedDeveloper],
        )

        const assigneeId = ticketStates.get(1)?.assigneePositionId
        expect(assigneeId).toBe("backend-developer")
    })
})
