import { formatDateTime } from "../../../../format-date-time.ts"
import { formatTaggedMessage } from "../../../../messaging/message/format-tagged-message.ts"
import { getAuthorName } from "../../../../messaging/message/get-author-name.ts"
import type { Message } from "../../../../messaging/message/schema.ts"
import { formatEntryNumbers } from "../../../../messaging/thread/format-entry-numbers.ts"
import type { Thread } from "../../../../messaging/thread/schema.ts"

export type CatchUp = {
    thread: Thread
    memberIds: string[]
    messages: Message[]
    readCount: number
}

export function buildCatchUpMessage({
    thread,
    memberIds,
    messages,
    readCount,
}: CatchUp): string {
    const { createdBy } = thread
    const creatorName = `${getAuthorName(createdBy)}, ${createdBy.position.title} (@${createdBy.position.id})`
    const memberMentions = memberIds.map((id) => `@${id}`).join(", ")
    const taggedEntries = messages
        .slice(readCount)
        .map((message, index) =>
            formatTaggedMessage(message, readCount + index + 1),
        )
    const unreadNumbers = formatEntryNumbers(readCount + 1, messages.length)
    return [
        `# Thread "${thread.subject}" (${thread.id})`,
        "",
        `Created by ${creatorName}, on ${formatDateTime(thread.createdAt)}. Its members: ${memberMentions}.`,
        "",
        ...(readCount > 0
            ? [
                  `You have read it up to entry #${readCount}: thread_show shows earlier entries again if you need them.`,
              ]
            : []),
        `${unreadNumbers}, which you haven't read:`,
        "",
        taggedEntries.join("\n\n"),
        "",
        "# Your task",
        "",
        "Catch up on this thread: if its entries ask something of your position, answer in the thread with message_send. Then call task_mark-as-done with a summary of what you did.",
    ].join("\n")
}
