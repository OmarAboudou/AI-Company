import type { Command } from "@commander-js/extra-typings"
import { z } from "zod"
import { formatIdArgumentDescription } from "../cli/format-id-argument-description.ts"
import { printColumns } from "../cli/print-columns.ts"
import { projectRoot } from "../cli/project-root.ts"
import { loadExistingThread } from "../cli-helpers.ts"
import { formatDateTime } from "../format-date-time.ts"
import {
    asPositionOption,
    bodyFileOption,
    bodyOption,
    readBody,
} from "../message/commands.ts"
import { createDraft } from "../messaging/message/create-draft.ts"
import { getAuthorName } from "../messaging/message/get-author-name.ts"
import { readCurrentAuthor } from "../messaging/message/read-current-author.ts"
import type { Author } from "../messaging/message/schema.ts"
import { sendDraft } from "../messaging/message/send-draft.ts"
import { listMessages } from "../messaging/message/storage.ts"
import { createThreadId } from "../messaging/thread/create-thread-id.ts"
import { getAwaitedIds } from "../messaging/thread/get-awaited-ids.ts"
import { getMemberIds } from "../messaging/thread/get-member-ids.ts"
import { listArchives } from "../messaging/thread/list-archives.ts"
import { ThreadConfigSchema } from "../messaging/thread/schema.ts"
import { saveThread } from "../messaging/thread/storage.ts"
import { requireCompany } from "../organization/company/require-company.ts"
import { listPositions } from "../organization/position/storage.ts"
import { UserError } from "../user-error.ts"
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
            await requireCompany(projectRoot)
            const author = await readCurrentAuthor(projectRoot, {
                asPositionId: options.asPosition,
            })
            const body = await readBody(options)
            const draft =
                body === undefined
                    ? undefined
                    : await createDraft(projectRoot, author, body)
            const createdAt = new Date().toISOString()
            const config = ThreadConfigSchema.safeParse({
                subject: options.subject,
                createdAt,
                createdBy: author,
            })
            if (!config.success) {
                throw new UserError(z.prettifyError(config.error))
            }
            const id = await createThreadId(
                projectRoot,
                config.data.subject,
                createdAt,
            )
            await saveThread(projectRoot, { id, ...config.data })
            console.log(id)
            if (draft !== undefined) {
                await sendDraft(projectRoot, id, draft)
                await answerMentions(projectRoot, id, draft.mentions)
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
            const thread = await loadExistingThread(rawId)
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
