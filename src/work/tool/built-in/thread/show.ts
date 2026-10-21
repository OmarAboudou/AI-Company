import { z } from "zod"
import { formatTaggedMessage } from "../../../../messaging/message/format-tagged-message.ts"
import { listMessages } from "../../../../messaging/message/storage.ts"
import { formatEntryNumbers } from "../../../../messaging/thread/format-entry-numbers.ts"
import { loadExistingThread } from "../../../../messaging/thread/load-existing-thread.ts"
import { UserError } from "../../../../user-error.ts"
import { defineTool } from "../../define-tool.ts"

export const maxEntriesPerCall = 20

function formatEntryCount(count: number): string {
    return count === 1 ? "1 entry" : `${count} entries`
}

function buildDescription(thread: string): string {
    return `Show ${thread} entries word for word, by their numbers, ${maxEntriesPerCall} at most per call. Your task gives you the entries you haven't read yet: this reads earlier ones.`
}

export const threadShowTool = defineTool({
    description: ({ threadId }) =>
        buildDescription(
            threadId === undefined ? "a thread's" : "this thread's",
        ),
    inputSchema: z.strictObject({
        threadId: z.string().meta({
            description:
                "Id of the thread, e.g. 2026-10-18-choice-of-framework.",
        }),
        from: z.int().min(1).meta({
            description: "Number of the first entry to show, from 1.",
        }),
        to: z.int().min(1).optional().meta({
            description:
                "Number of the last entry to show; the thread's last when absent.",
        }),
    }),
    async execute({ threadId, from, to }, { projectRoot }) {
        const thread = await loadExistingThread(projectRoot, threadId)
        const messages = await listMessages(projectRoot, thread.id)
        if (messages.length === 0) {
            throw new UserError(`Thread ${thread.id} has no entries yet.`)
        }
        if (from > messages.length) {
            throw new UserError(
                `Thread ${thread.id} has ${formatEntryCount(messages.length)}: give a from between 1 and ${messages.length}.`,
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
            from + maxEntriesPerCall - 1,
        )
        const taggedEntries = messages
            .slice(from - 1, shownLastNumber)
            .map((message, index) => formatTaggedMessage(message, from + index))
        const lines = [
            `${formatEntryNumbers(from, shownLastNumber)} of the thread "${thread.subject}" (${thread.id}), which has ${messages.length}:`,
            "",
            taggedEntries.join("\n\n"),
        ]
        if (shownLastNumber < lastNumber) {
            lines.push(
                "",
                `Only ${maxEntriesPerCall} entries are shown per call: call thread_show again from ${shownLastNumber + 1} for the next ones.`,
            )
        }
        return { text: lines.join("\n") }
    },
})
