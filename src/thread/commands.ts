import type { Command } from "@commander-js/extra-typings"
import { formatIdArgumentDescription } from "../cli/format-id-argument-description.ts"
import { printAnswerEvent } from "../cli/print-answer-event.ts"
import { printColumns } from "../cli/print-columns.ts"
import { printUnknownMentions } from "../cli/print-unknown-mentions.ts"
import { projectRoot } from "../cli/project-root.ts"
import { formatDateTime } from "../format-date-time.ts"
import {
    asPositionOption,
    bodyFileOption,
    bodyOption,
    readBody,
} from "../message/commands.ts"
import { getAuthorName } from "../messaging/message/get-author-name.ts"
import type { Author } from "../messaging/message/schema.ts"
import { listMessages } from "../messaging/message/storage.ts"
import { createThread } from "../messaging/thread/create-thread.ts"
import { getAwaitedIds } from "../messaging/thread/get-awaited-ids.ts"
import { getMemberIds } from "../messaging/thread/get-member-ids.ts"
import { listArchives } from "../messaging/thread/list-archives.ts"
import { loadExistingThread } from "../messaging/thread/load-existing-thread.ts"
import { requireCompany } from "../organization/company/require-company.ts"
import { listPositions } from "../organization/position/storage.ts"
import { answerMentions } from "../work/answer-mentions.ts"

function signature(author: Author): string {
    const { position } = author
    return `${getAuthorName(author)}, ${position.title} (@${position.id})`
}

function mentionsOf(positionIds: string[]): string {
    return positionIds.map((id) => `@${id}`).join(", ")
}

export function registerThreadCommands(program: Command): void {
    const threadCommand = program
        .command("thread")
        .description(
            "Manage the company's threads, where positions exchange messages.",
        )

    threadCommand
        .command("create")
        .description(
            "Create a thread as the person at the keyboard (see current-human), and print its id.",
        )
        .requiredOption("-s, --subject <subject>", "subject of the thread")
        .addOption(bodyOption("the thread's first message"))
        .addOption(bodyFileOption("the thread's first message"))
        .addOption(asPositionOption())
        .action(async (options) => {
            const body = await readBody(options)
            const { thread, firstMessage, unknownMentionIds } =
                await createThread(projectRoot, {
                    subject: options.subject,
                    body,
                    asPositionId: options.asPosition,
                })
            console.log(thread.id)
            printUnknownMentions(unknownMentionIds)
            if (firstMessage !== undefined) {
                await answerMentions(
                    projectRoot,
                    thread.id,
                    firstMessage.mentions,
                    printAnswerEvent,
                )
            }
        })

    threadCommand
        .command("list")
        .description(
            "List the threads, oldest first, with the positions they await.",
        )
        .action(async () => {
            await requireCompany(projectRoot)
            const [archives, positions] = await Promise.all([
                listArchives(projectRoot),
                listPositions(projectRoot),
            ])
            if (archives.length === 0) {
                console.log("No threads yet. Run `llmco thread create`.")
                return
            }
            printColumns(
                archives.map(({ thread, messages }) => {
                    const awaited = getAwaitedIds(thread, messages, positions)
                    return [
                        thread.id,
                        thread.subject,
                        awaited.length > 0
                            ? `awaiting ${mentionsOf(awaited)}`
                            : "",
                    ]
                }),
            )
        })

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
