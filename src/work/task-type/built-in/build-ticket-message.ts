import { formatPositionLabel } from "../../../messaging/message/format-position-label.ts"
import { formatTaggedMessage } from "../../../messaging/message/format-tagged-message.ts"
import type { TicketSituation } from "./load-ticket-situation.ts"

function buildDiscussionLines({
    messages,
    firstNewMessageNumber,
}: TicketSituation): string[] {
    const newMessages = messages.slice(firstNewMessageNumber - 1)
    const taggedMessages = newMessages.map((message, index) =>
        formatTaggedMessage(message, firstNewMessageNumber + index),
    )
    if (messages.length === 0) {
        return []
    }
    if (newMessages.length === 0) {
        return [
            "No message arrived since your last session on it: ticket_show reads its discussion.",
            "",
        ]
    }
    const heading =
        firstNewMessageNumber === 1
            ? "Its discussion:"
            : `Its discussion since your last session on it, from message #${firstNewMessageNumber} (ticket_show reads the earlier ones):`
    return [heading, "", taggedMessages.join("\n\n"), ""]
}

export function formatTicketPositionLabel(
    { positions }: TicketSituation,
    positionId: string,
): string {
    const position = positions.find(({ id }) => id === positionId)
    return position === undefined
        ? `@${positionId}`
        : formatPositionLabel(position)
}

export function buildTicketMessage(
    situation: TicketSituation,
    {
        introduction,
        instructions,
    }: { introduction: string; instructions: string },
): string {
    const { ticket } = situation
    return [
        introduction,
        "",
        `<request ticket="${ticket.number}">`,
        `# ${ticket.title}`,
        "",
        ticket.request.trimEnd(),
        "</request>",
        "",
        ...buildDiscussionLines(situation),
        instructions,
    ].join("\n")
}
