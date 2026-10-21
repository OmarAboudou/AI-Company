import { z } from "zod"
import { readGitCommitter } from "../../../../git/read-git-committer.ts"
import { createUnsentMessage } from "../../../../messaging/message/create-unsent-message.ts"
import { formatUnknownMentionMessage } from "../../../../messaging/message/format-unknown-mention-message.ts"
import { sendUnsentMessage } from "../../../../messaging/message/send-unsent-message.ts"
import { listMessages } from "../../../../messaging/message/storage.ts"
import { loadExistingThread } from "../../../../messaging/thread/load-existing-thread.ts"
import { defineTool } from "../../define-tool.ts"

export const messageSendTool = defineTool({
    description:
        "Send a message in a thread, from your position. To ask a position to act on the thread, mention it in the message as @position-id: a position you don't mention isn't asked anything.",
    inputSchema: z.strictObject({
        threadId: z.string().meta({
            description:
                "Id of the thread, e.g. 2026-10-18-choice-of-framework.",
        }),
        body: z.string().meta({ description: "The message, in Markdown." }),
    }),
    async execute({ threadId, body }, ctx) {
        const { projectRoot, position, employee } = ctx
        const thread = await loadExistingThread(projectRoot, threadId)
        const author = {
            position: { id: position.id, title: position.title },
            employee: { id: employee.id, name: employee.name },
            committer: readGitCommitter(projectRoot),
        }
        const unsentMessage = await createUnsentMessage(
            projectRoot,
            author,
            body,
        )
        const message = await sendUnsentMessage(
            projectRoot,
            thread.id,
            unsentMessage,
            { depth: ctx.taskDepth, runId: ctx.runId },
        )
        const threadMessages = await listMessages(projectRoot, thread.id)
        const entryNumber =
            threadMessages.findIndex(({ id }) => id === message.id) + 1
        return {
            text: [
                `Sent as entry #${entryNumber} of thread ${thread.id}.`,
                ...unsentMessage.unknownMentionIds.map(
                    formatUnknownMentionMessage,
                ),
            ].join("\n"),
        }
    },
})
