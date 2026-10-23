import type { Command } from "@commander-js/extra-typings"
import { loadJournal } from "../../../journal/storage.ts"
import { getTicketStates } from "../../../messaging/ticket/get-ticket-states.ts"
import { listTickets } from "../../../messaging/ticket/storage.ts"
import { requireCompany } from "../../../organization/company/require-company.ts"
import { listPositions } from "../../../organization/position/storage.ts"
import { printColumns } from "../../print-columns.ts"
import { projectRoot } from "../../project-root.ts"

export function registerTicketListCommand(ticketCommand: Command): void {
    ticketCommand
        .command("list")
        .description(
            "List the tickets, in the order of their numbers, with their state and their two positions: the requester, then the assignee.",
        )
        .action(async () => {
            await requireCompany(projectRoot)
            const [tickets, journal, positions] = await Promise.all([
                listTickets(projectRoot),
                loadJournal(projectRoot),
                listPositions(projectRoot),
            ])
            if (tickets.length === 0) {
                console.log("No tickets yet.")
                return
            }
            const ticketStates = getTicketStates(
                tickets,
                journal.events,
                positions,
            )
            printColumns(
                tickets.flatMap((ticket) => {
                    const state = ticketStates.get(ticket.number)
                    if (state === undefined) {
                        return []
                    }
                    const { requesterPositionId, assigneePositionId } = state
                    return [
                        [
                            `#${ticket.number}`,
                            state.status,
                            `@${requesterPositionId} → @${assigneePositionId}`,
                            ticket.title,
                        ],
                    ]
                }),
            )
        })
}
