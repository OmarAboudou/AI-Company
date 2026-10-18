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
import { currentAuthor } from "../message/author.ts"
import {
    bodyFileOption,
    bodyOption,
    readBody,
    sendMessage,
} from "../message/commands.ts"
import type { Message } from "../message/message.ts"
import { listMessages } from "../message/storage.ts"
import { listThreads, newThreadId, saveThread } from "./storage.ts"
import { ThreadConfigSchema } from "./thread.ts"

function signature({
    position,
    employee,
    committer,
}: Pick<Message, "position" | "employee" | "committer">): string {
    const name = employee?.name ?? committer.name
    return `${name}, ${position.title} (@${position.id})`
}

function minutes(timestamp: string): string {
    return `${timestamp.slice(0, 10)} ${timestamp.slice(11, 16)} UTC`
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
            "Create a thread from the director's position, and print its id.",
        )
        .requiredOption("-s, --subject <subject>", "subject of the thread")
        .addOption(bodyOption("the thread's first message"))
        .addOption(bodyFileOption("the thread's first message"))
        .action(async (options) => {
            await requireCompany()
            const author = await currentAuthor()
            const body = await readBody(options)
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
            if (body !== undefined) {
                await sendMessage(id, body)
            }
            console.log(id)
        })

    threadCommand
        .command("list")
        .description("List the threads, oldest first.")
        .action(async () => {
            await requireCompany()
            const threads = await listThreads(projectRoot)
            if (threads.length === 0) {
                console.log("No threads yet. Run `llmco thread create`.")
                return
            }
            printColumns(threads.map(({ id, subject }) => [id, subject]))
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
            const messages = await listMessages(projectRoot, thread.id)
            if (json) {
                for (const { threadId, ...message } of messages) {
                    console.log(JSON.stringify(message))
                }
                return
            }
            const lines = [
                `# ${thread.subject}`,
                "",
                `Created by ${signature(thread.createdBy)}, ${minutes(thread.createdAt)}.`,
            ]
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
