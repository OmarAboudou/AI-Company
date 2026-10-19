import type { Command } from "@commander-js/extra-typings"
import { formatDateTime } from "../../../format-date-time.ts"
import { getAuthorName } from "../../../messaging/message/get-author-name.ts"
import type { Author } from "../../../messaging/message/schema.ts"
import { listMessages } from "../../../messaging/message/storage.ts"
import { getAwaitedIds } from "../../../messaging/thread/get-awaited-ids.ts"
import { getMemberIds } from "../../../messaging/thread/get-member-ids.ts"
import { loadExistingThread } from "../../../messaging/thread/load-existing-thread.ts"
import { requireCompany } from "../../../organization/company/require-company.ts"
import { listPositions } from "../../../organization/position/storage.ts"
import { formatIdArgumentDescription } from "../../format-id-argument-description.ts"
import { projectRoot } from "../../project-root.ts"
import { mentionsOf } from "./format-mentions.ts"

function signature(author: Author): string {
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
        .action(async (rawId, { json }) => {
            await requireCompany(projectRoot)
            const thread = await loadExistingThread(projectRoot, rawId)
            const [messages, positions] = await Promise.all([
                listMessages(projectRoot, thread.id),
                listPositions(projectRoot),
            ])
            if (json) {
                for (const { threadId, ...message } of messages) {
                    console.log(JSON.stringify(message))
                }
                return
            }
            const awaited = getAwaitedIds(thread, messages, positions)
            const lines = [
                `# ${thread.subject}`,
                "",
                `Created by ${signature(thread.createdBy)}, ${formatDateTime(thread.createdAt)}.`,
                `Members: ${mentionsOf(getMemberIds(thread, messages, positions))}.`,
            ]
            if (awaited.length > 0) {
                lines.push(`Awaiting: ${mentionsOf(awaited)}.`)
            }
            for (const message of messages) {
                lines.push(
                    "",
                    `## ${signature(message)} · ${formatDateTime(message.sentAt)}`,
                    "",
                    message.body.trimEnd(),
                )
            }
            console.log(lines.join("\n"))
        })
}
