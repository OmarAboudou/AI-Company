import { formatDateTime } from "../../format-date-time.ts"
import { getAuthorName } from "./get-author-name.ts"
import type { Message } from "./schema.ts"

function escapeAttribute(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
}

export function formatTaggedMessage(message: Message, number: number): string {
    const { position } = message
    const escapedAuthorName = escapeAttribute(getAuthorName(message))
    const escapedPositionName = escapeAttribute(
        `${position.title} (@${position.id})`,
    )
    const sentDateTime = formatDateTime(message.sentAt)
    return [
        `<message number="${number}" from="${escapedAuthorName}" position="${escapedPositionName}" sent="${sentDateTime}">`,
        message.body.trimEnd(),
        "</message>",
    ].join("\n")
}
