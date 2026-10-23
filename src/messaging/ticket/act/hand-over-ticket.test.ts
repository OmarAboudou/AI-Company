import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { listEvents, loadJournal } from "../../../journal/storage.ts"
import { createTemporaryCompany } from "../../../organization/company/create-temporary-company.testing.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { listPositions } from "../../../organization/position/storage.ts"
import type { Author } from "../../message/schema.ts"
import { createExampleTicket } from "../create-example-ticket.testing.ts"
import { getTicketStates } from "../get-ticket-states.ts"
import { loadTicket } from "../storage.ts"
import { actOnTicket } from "./act-on-ticket.ts"
import { handOverTicket } from "./hand-over-ticket.ts"

const committer = { name: "Test User", email: "test@example.com" }
const director: Author = {
    position: { id: "director", title: "Director" },
    committer,
}
const developer: Author = {
    position: { id: "developer", title: "Developer" },
    committer,
}

let projectRoot: string
let ticketNumber: number

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await Promise.all(
        ["developer", "designer"].map((id) =>
            createPosition(projectRoot, id, { title: id, description: "" }),
        ),
    )
    const ticket = await createExampleTicket(projectRoot, {
        rawAssigneePositionId: "developer",
    })
    ticketNumber = ticket.number
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function handOver(rawAssigneePositionId: string, author = director) {
    return handOverTicket(
        await loadJournal(projectRoot),
        author,
        { ticketNumber, body: "The designer knows.", rawAssigneePositionId },
        { depth: 0 },
    )
}

async function loadTicketState() {
    const [ticket, journal, positions] = await Promise.all([
        loadTicket(projectRoot, ticketNumber),
        loadJournal(projectRoot),
        listPositions(projectRoot),
    ])
    return getTicketStates([ticket], journal.events, positions).get(
        ticketNumber,
    )
}

describe("handOverTicket", () => {
    test("hands the ticket over to another position, which has the hand", async () => {
        const message = await handOver("designer")

        expect(await loadTicketState()).toMatchObject({
            status: "open",
            assigneePositionId: "designer",
        })
        expect((await listEvents(projectRoot)).at(-1)).toMatchObject({
            type: "ticket-handed-over",
            ticketNumber,
            messageId: message.id,
            positionId: "director",
            assigneePositionId: "designer",
        })
    })

    test("hands over a ticket whose requester has the hand", async () => {
        await actOnTicket(
            await loadJournal(projectRoot),
            "ask",
            developer,
            { ticketNumber, body: "Which colors?" },
            { depth: 0 },
        )

        await handOver("designer")

        expect(await loadTicketState()).toMatchObject({
            status: "open",
            assigneePositionId: "designer",
        })
    })

    test("hands over a ticket its assignee renounced", async () => {
        await actOnTicket(
            await loadJournal(projectRoot),
            "renounce",
            developer,
            { ticketNumber, body: "No design skills." },
            { depth: 0 },
        )

        await handOver("designer")

        expect(await loadTicketState()).toMatchObject({
            status: "open",
            assigneePositionId: "designer",
        })
    })

    test("refuses to hand a ticket over to its assignee", async () => {
        const handingOver = handOver("developer")

        await expect(handingOver).rejects.toThrow(
            `@developer is already the assignee of ticket #${ticketNumber}: hand it over to another position.`,
        )
    })

    test("refuses a position that doesn't exist", async () => {
        const handingOver = handOver("tester")

        await expect(handingOver).rejects.toThrow('No position "tester".')
    })

    test("lets only the director hand a ticket over", async () => {
        const handingOver = handOver("designer", developer)

        await expect(handingOver).rejects.toThrow(
            `You can't hand over ticket #${ticketNumber}: only the director, @director, can.`,
        )
    })
})
