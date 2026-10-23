import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { listEvents, loadJournal } from "../../../journal/storage.ts"
import { createTemporaryCompany } from "../../../organization/company/create-temporary-company.testing.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { listPositions } from "../../../organization/position/storage.ts"
import { UserError } from "../../../user-error.ts"
import type { Author } from "../../message/schema.ts"
import { listMessages } from "../../message/storage.ts"
import { createExampleTicket } from "../create-example-ticket.testing.ts"
import { getTicketStates } from "../get-ticket-states.ts"
import { loadTicket } from "../storage.ts"
import { actOnTicket } from "./act-on-ticket.ts"
import type { MessageActName } from "./ticket-acts.ts"

const committer = { name: "Test User", email: "test@example.com" }
const founder: Author = {
    position: { id: "founder", title: "Founder" },
    committer,
}
const developer: Author = {
    position: { id: "developer", title: "Developer" },
    employee: { id: "claude", name: "Claude" },
    committer,
}

let projectRoot: string
let ticketNumber: number

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await createPosition(projectRoot, "developer", {
        title: "Developer",
        description: "",
    })
    const ticket = await createExampleTicket(projectRoot, {
        rawAssigneePositionId: "developer",
    })
    ticketNumber = ticket.number
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function act(actName: MessageActName, author: Author, body = "Noted.") {
    const journal = await loadJournal(projectRoot)
    return actOnTicket(
        journal,
        actName,
        author,
        { ticketNumber, body },
        { depth: 1, runId: "20261023-150000-000-9e8d" },
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

describe("actOnTicket", () => {
    test("writes the act's message, recorded as the act", async () => {
        const question = await act("ask", developer, "Hono or Express?")

        expect(await listMessages(projectRoot, ticketNumber)).toEqual([
            question,
        ])
        expect((await listEvents(projectRoot)).at(-1)).toMatchObject({
            type: "ticket-question-asked",
            depth: 1,
            ticketNumber,
            messageId: question.id,
            positionId: "developer",
            runId: "20261023-150000-000-9e8d",
        })
    })

    test("passes the hand from one position to the other, act by act", async () => {
        await act("ask", developer)
        const waitingState = await loadTicketState()
        await act("answer", founder)
        const answeredState = await loadTicketState()
        await act("deliver", developer)
        const deliveredState = await loadTicketState()

        expect(waitingState?.status).toBe("waiting")
        expect(answeredState?.status).toBe("open")
        expect(deliveredState?.status).toBe("to-validate")
    })

    test("closes the ticket, done, once its delivery is validated", async () => {
        await act("deliver", developer)
        await act("refuse", founder)
        const refusedState = await loadTicketState()
        await act("deliver", developer)

        await act("validate", founder)

        expect(refusedState?.status).toBe("open")
        expect(await loadTicketState()).toMatchObject({
            status: "closed",
            outcome: "done",
        })
    })

    test.each([[[]], [["ask"]], [["deliver"]]] as const)(
        "lets the requester cancel the ticket after %p",
        async (acts) => {
            for (const actName of acts) {
                await act(actName, developer)
            }

            await act("cancel", founder, "No longer needed.")

            expect(await loadTicketState()).toMatchObject({
                status: "closed",
                outcome: "cancelled",
            })
        },
    )

    test("lets the assignee renounce, for the founder to arbitrate", async () => {
        await act("renounce", developer, "No access to the API.")

        const delivering = act("deliver", developer)

        expect((await loadTicketState())?.status).toBe("to-arbitrate")
        await expect(delivering).rejects.toThrow(
            `You can't deliver ticket #${ticketNumber} now: it waits for @founder to arbitrate it.`,
        )
    })

    test("lets the founder give a renounced ticket back to its assignee", async () => {
        await act("renounce", developer, "No access to the API.")

        await act("give-back", founder, "You have access now.")

        expect((await loadTicketState())?.status).toBe("open")
    })

    test("refuses to give back a ticket that wasn't renounced", async () => {
        const givingBack = act("give-back", founder)

        await expect(givingBack).rejects.toThrow(
            `You can't give back ticket #${ticketNumber} now: its assignee has the hand.`,
        )
    })

    test("refuses to renounce a ticket whose requester has the hand", async () => {
        await act("ask", developer)

        const renouncing = act("renounce", developer)

        await expect(renouncing).rejects.toThrow(
            `You can't renounce ticket #${ticketNumber} now: it waits for @founder to answer.`,
        )
    })

    test("lets the founder close the ticket, failed, whoever has the hand", async () => {
        await act("ask", developer)

        await act("close", founder, "The API is dropped.")

        expect(await loadTicketState()).toMatchObject({
            status: "closed",
            outcome: "failed",
        })
    })

    test("lets only the founder close a ticket as failed", async () => {
        const closing = act("close", developer)

        await expect(closing).rejects.toThrow(
            `You can't close ticket #${ticketNumber}: only the founder, @founder, can.`,
        )
    })

    test("refuses an act from a position whose role it isn't", async () => {
        const delivering = act("deliver", founder)

        const refusalMessage = `You can't deliver ticket #${ticketNumber}: only its assignee, @developer, can.`
        await expect(delivering).rejects.toThrow(UserError)
        await expect(delivering).rejects.toThrow(refusalMessage)
    })

    test("refuses an act the ticket's state doesn't allow", async () => {
        await act("ask", developer)

        const delivering = act("deliver", developer)

        const refusalMessage = `You can't deliver ticket #${ticketNumber} now: it waits for @founder to answer.`
        await expect(delivering).rejects.toThrow(refusalMessage)
    })

    test("refuses any act on a closed ticket", async () => {
        await act("cancel", founder)

        const asking = act("ask", developer)

        await expect(asking).rejects.toThrow("now: it is closed, cancelled.")
    })

    test("lets a position that works for itself deliver to itself", async () => {
        const ticket = await createExampleTicket(projectRoot)
        ticketNumber = ticket.number

        await act("deliver", founder)
        await act("validate", founder)

        expect((await loadTicketState())?.status).toBe("closed")
    })

    test("refuses an act without a message", async () => {
        const asking = act("ask", developer, " ")

        await expect(asking).rejects.toThrow("The message's body is empty.")
    })

    test("refuses a ticket that doesn't exist", async () => {
        ticketNumber = 9

        const asking = act("ask", developer)

        await expect(asking).rejects.toThrow("No ticket #9.")
    })
})
