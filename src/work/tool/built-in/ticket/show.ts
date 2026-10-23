import { z } from "zod"
import { formatTaggedMessage } from "../../../../messaging/message/format-tagged-message.ts"
import { listMessages } from "../../../../messaging/message/storage.ts"
import { loadExistingTicket } from "../../../../messaging/ticket/load-existing-ticket.ts"
import { TicketNumberSchema } from "../../../../messaging/ticket/schema.ts"
import { UserError } from "../../../../user-error.ts"
import { defineTool } from "../../define-tool.ts"

export const maxMessagesPerCall = 20

function formatMessageCount(count: number): string {
    return count === 1 ? "1 message" : `${count} messages`
}

function formatMessageNumbers(firstNumber: number, lastNumber: number): string {
    return firstNumber === lastNumber
        ? `Message #${firstNumber}`
        : `Messages #${firstNumber} to #${lastNumber}`
}

function buildDescription(ticket: string): string {
    return `Show ${ticket} discussion word for word, its messages by their numbers, ${maxMessagesPerCall} at most per call. Your task gives you the messages you haven't read yet: this reads earlier ones.`
}

export const ticketShowTool = defineTool({
    description: ({ ticketNumber }) =>
        buildDescription(
            ticketNumber === undefined ? "a ticket's" : "this ticket's",
        ),
    inputSchema: z.strictObject({
        ticketNumber: TicketNumberSchema.meta({
            description: "Number of the ticket, e.g. 3 for ticket #3.",
        }),
        from: z.int().min(1).meta({
            description: "Number of the first message to show, from 1.",
        }),
        to: z.int().min(1).optional().meta({
            description:
                "Number of the last message to show; the discussion's last when absent.",
        }),
    }),
    async execute({ ticketNumber, from, to }, { projectRoot }) {
        const ticket = await loadExistingTicket(projectRoot, ticketNumber)
        const messages = await listMessages(projectRoot, ticket.number)
        if (messages.length === 0) {
            throw new UserError(`Ticket #${ticket.number} has no messages yet.`)
        }
        if (from > messages.length) {
            throw new UserError(
                `Ticket #${ticket.number} has ${formatMessageCount(messages.length)}: give a from between 1 and ${messages.length}.`,
            )
        }
        const lastNumber = Math.min(to ?? messages.length, messages.length)
        if (lastNumber < from) {
            throw new UserError(
                `to comes before from: give a to of ${from} or more.`,
            )
        }
        const shownLastNumber = Math.min(
            lastNumber,
            from + maxMessagesPerCall - 1,
        )
        const taggedMessages = messages
            .slice(from - 1, shownLastNumber)
            .map((message, index) => formatTaggedMessage(message, from + index))
        const lines = [
            `${formatMessageNumbers(from, shownLastNumber)} of ticket #${ticket.number}, "${ticket.title}", which has ${messages.length}:`,
            "",
            taggedMessages.join("\n\n"),
        ]
        if (shownLastNumber < lastNumber) {
            lines.push(
                "",
                `Only ${maxMessagesPerCall} messages are shown per call: call ticket_show again from ${shownLastNumber + 1} for the next ones.`,
            )
        }
        return { text: lines.join("\n") }
    },
})
