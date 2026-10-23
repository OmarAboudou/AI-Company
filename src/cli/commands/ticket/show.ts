import type { Command } from "@commander-js/extra-typings"
import { formatDateTime } from "../../../format-date-time.ts"
import { loadJournal } from "../../../journal/storage.ts"
import { formatAuthorSignature } from "../../../messaging/message/format-author-signature.ts"
import { formatPositionLabel } from "../../../messaging/message/format-position-label.ts"
import { listMessages } from "../../../messaging/message/storage.ts"
import { getTicketStates } from "../../../messaging/ticket/get-ticket-states.ts"
import { loadExistingTicket } from "../../../messaging/ticket/load-existing-ticket.ts"
import { parseTicketNumber } from "../../../messaging/ticket/parse-ticket-number.ts"
import { requireCompany } from "../../../organization/company/require-company.ts"
import { listPositions } from "../../../organization/position/storage.ts"
import { projectRoot } from "../../project-root.ts"
import { formatTicketState } from "./format-ticket-state.ts"

export function registerTicketShowCommand(ticketCommand: Command): void {
    ticketCommand
        .command("show")
        .description(
            "Display a ticket, its request and its discussion, in Markdown or, with --json, one JSON message per line.",
        )
        .argument("<ticket-number>", "number of the ticket, e.g. 3 or #3")
        .option("-j, --json", "print one JSON object per message and line")
        .action(async (rawNumber, { json: shouldPrintJson }) => {
            await requireCompany(projectRoot)
            const ticket = await loadExistingTicket(
                projectRoot,
                parseTicketNumber(rawNumber),
            )
            const [messages, journal, positions] = await Promise.all([
                listMessages(projectRoot, ticket.number),
                loadJournal(projectRoot),
                listPositions(projectRoot),
            ])
            if (shouldPrintJson) {
                for (const { ticketNumber, ...message } of messages) {
                    console.log(JSON.stringify(message))
                }
                return
            }
            const state = getTicketStates(
                [ticket],
                journal.events,
                positions,
            ).get(ticket.number)
            const requesterSignature = formatAuthorSignature({
                ...ticket,
                position: ticket.requester,
            })
            const markdownLines = [
                `# #${ticket.number} ${ticket.title}`,
                "",
                `Asked by ${requesterSignature}, to ${formatPositionLabel(ticket.assignee)}, ${formatDateTime(ticket.createdAt)}.`,
                ...(state === undefined
                    ? []
                    : [`State: ${formatTicketState(state)}.`]),
                "",
                ticket.request.trimEnd(),
            ]
            for (const message of messages) {
                markdownLines.push(
                    "",
                    `## ${formatAuthorSignature(message)} · ${formatDateTime(message.sentAt)}`,
                    "",
                    message.body.trimEnd(),
                )
            }
            console.log(markdownLines.join("\n"))
        })
}
