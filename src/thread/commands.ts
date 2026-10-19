import type { Command } from "@commander-js/extra-typings"
import { z } from "zod"
import {
    idDescription,
    loadExistingThread,
    printColumns,
    projectRoot,
    requireCompany,
} from "../cli-helpers.ts"
import { UserError } from "../errors.ts"
import { answerMentions } from "../llm/reply.ts"
import { currentAuthor } from "../message/author.ts"
import {
    asPositionOption,
    bodyFileOption,
    bodyOption,
    draftMessage,
    readBody,
    sendDraft,
} from "../message/commands.ts"
import { minutes, signature } from "../message/signature.ts"
import { listMessages } from "../message/storage.ts"
import { listPositions } from "../position/storage.ts"
import { readArchives } from "./archives.ts"
import { awaitedIds, memberIds } from "./members.ts"
import { newThreadId, saveThread } from "./storage.ts"
import { ThreadConfigSchema } from "./thread.ts"

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
            "Create a thread as the person at the keyboard (see whoami), and print its id.",
        )
        .requiredOption("-s, --subject <subject>", "subject of the thread")
        .addOption(bodyOption("the thread's first message"))
        .addOption(bodyFileOption("the thread's first message"))
        .addOption(asPositionOption())
        .action(async (options) => {
            await requireCompany()
            const author = await currentAuthor({
                asPositionId: options.asPosition,
            })
            const body = await readBody(options)
            const draft =
                body === undefined
                    ? undefined
                    : await draftMessage(author, body)
            const createdAt = new Date().toISOString()
            const config = ThreadConfigSchema.safeParse({
                subject: options.subject,
                createdAt,
                createdBy: author,
            })
            if (!config.success) {
                throw new UserError(z.prettifyError(config.error))
            }
            const id = await newThreadId(
                projectRoot,
                config.data.subject,
                createdAt,
            )
            await saveThread(projectRoot, { id, ...config.data })
            console.log(id)
            if (draft !== undefined) {
                await sendDraft(id, draft)
                await answerMentions(id, draft.mentions)
            }
        })

    threadCommand
        .command("list")
        .description(
            "List the threads, oldest first, with the positions they await.",
        )
        .action(async () => {
            await requireCompany()
            const [archives, positions] = await Promise.all([
                readArchives(projectRoot),
                listPositions(projectRoot),
            ])
            if (archives.length === 0) {
                console.log("No threads yet. Run `llmco thread create`.")
                return
            }
            printColumns(
                archives.map(({ thread, messages }) => {
                    const awaited = awaitedIds(thread, messages, positions)
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
            idDescription("thread", "2026-10-18-choice-of-framework"),
        )
        .option("-j, --json", "print one JSON object per message and line")
        .action(async (rawId, { json }) => {
            await requireCompany()
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
            const awaited = awaitedIds(thread, messages, positions)
            const lines = [
                `# ${thread.subject}`,
                "",
                `Created by ${signature(thread.createdBy)}, ${minutes(thread.createdAt)}.`,
                `Members: ${mentionsOf(memberIds(thread, messages, positions))}.`,
            ]
            if (awaited.length > 0) {
                lines.push(`Awaiting: ${mentionsOf(awaited)}.`)
            }
            for (const message of messages) {
                lines.push(
                    "",
                    `## ${signature(message)} · ${minutes(message.sentAt)}`,
                    "",
                    message.body.trimEnd(),
                )
            }
            console.log(lines.join("\n"))
        })
}
