import type { Command } from "@commander-js/extra-typings"
import { formatDateTime } from "../../../format-date-time.ts"
import { getAuthorName } from "../../../messaging/message/get-author-name.ts"
import type { Author } from "../../../messaging/message/schema.ts"
import { listMessages } from "../../../messaging/message/storage.ts"
import { getMemberIds } from "../../../messaging/thread/get-member-ids.ts"
import { loadExistingThread } from "../../../messaging/thread/load-existing-thread.ts"
import { requireCompany } from "../../../organization/company/require-company.ts"
import { listPositions } from "../../../organization/position/storage.ts"
import { loadPendingPositionIdsByThread } from "../../../work/task/load-pending-position-ids-by-thread.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { formatMentions } from "./format-mentions.ts"

function formatSignature(author: Author): string {
    const { position } = author
    return `${getAuthorName(author)}, ${position.title} (@${position.id})`
}

export function registerThreadShowCommand(threadCommand: Command): void {
    threadCommand
        .command("show")
        .description(
            "Display a thread and its messages, in Markdown or, with --json, one JSON message per line.",
        )
        .argument(
            "<thread-id>",
            formatIdArgumentDescription(
                "thread",
                "2026-10-18-choice-of-framework",
            ),
        )
        .option("-j, --json", "print one JSON object per message and line")
        .action(async (rawId, { json: shouldPrintJson }) => {
            await requireCompany(projectRoot)
            const thread = await loadExistingThread(projectRoot, rawId)
            const [messages, positions, pendingPositionIdsByThread] =
                await Promise.all([
                    listMessages(projectRoot, thread.id),
                    listPositions(projectRoot),
                    loadPendingPositionIdsByThread(projectRoot),
                ])
            if (shouldPrintJson) {
                for (const { threadId, ...message } of messages) {
                    console.log(JSON.stringify(message))
                }
                return
            }
            const pendingPositionIds =
                pendingPositionIdsByThread.get(thread.id) ?? []
            const markdownLines = [
                `# ${thread.subject}`,
                "",
                `Created by ${formatSignature(thread.createdBy)}, ${formatDateTime(thread.createdAt)}.`,
                `Members: ${formatMentions(getMemberIds(thread, messages, positions))}.`,
            ]
            if (pendingPositionIds.length > 0) {
                markdownLines.push(
                    `Tasks pending for ${formatMentions(pendingPositionIds)}.`,
                )
            }
            for (const message of messages) {
                markdownLines.push(
                    "",
                    `## ${formatSignature(message)} · ${formatDateTime(message.sentAt)}`,
                    "",
                    message.body.trimEnd(),
                )
            }
            console.log(markdownLines.join("\n"))
        })
}
