import { formatUnknownMentionMessage } from "../messaging/message/format-unknown-mention-message.ts"

export function printUnknownMentions(unknownMentionIds: string[]): void {
    for (const mentionId of unknownMentionIds) {
        console.error(formatUnknownMentionMessage(mentionId))
    }
}
