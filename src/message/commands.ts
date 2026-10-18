import { type Command, Option } from "@commander-js/extra-typings"
import {
    idDescription,
    loadExistingThread,
    projectRoot,
    readTextOrFile,
    requireCompany,
} from "../cli-helpers.ts"
import { UserError } from "../errors.ts"
import { currentAuthor } from "./author.ts"
import {
    listMessages,
    newMessageId,
    nextSentAt,
    saveMessage,
} from "./storage.ts"

export function bodyOption(what = "the message") {
    return new Option("-b, --body <text>", `${what}, in Markdown`)
}

export function bodyFileOption(what = "the message") {
    return new Option(
        "-F, --body-file <path>",
        `read ${what} from a file, or from stdin with -`,
    ).conflicts("body")
}

export async function readBody(options: {
    body?: string
    bodyFile?: string
}): Promise<string | undefined> {
    const body = await readTextOrFile(options.body, options.bodyFile)
    if (body !== undefined && body.trim() === "") {
        throw new UserError("The message's body is empty.")
    }
    return body
}

export async function sendMessage(
    threadId: string,
    body: string,
): Promise<string> {
    const [author, messages] = await Promise.all([
        currentAuthor(),
        listMessages(projectRoot, threadId),
    ])
    const sentAt = nextSentAt(messages, new Date())
    const id = newMessageId(sentAt)
    await saveMessage(projectRoot, { threadId, id, ...author, sentAt, body })
    return id
}

export function registerMessageCommands(program: Command): void {
    const messageCommand = program
        .command("message")
        .description("Write messages in the company's threads.")

    messageCommand
        .command("send")
        .description(
            "Send a message in a thread, from the director's position.",
        )
        .argument(
            "<thread-id>",
            idDescription("thread", "2026-10-18-choice-of-framework"),
        )
        .addOption(bodyOption())
        .addOption(bodyFileOption())
        .action(async (rawThreadId, options) => {
            await requireCompany()
            const thread = await loadExistingThread(rawThreadId)
            const body = await readBody(options)
            if (body === undefined) {
                throw new UserError(
                    "Give the message with -b, --body or -F, --body-file.",
                )
            }
            const id = await sendMessage(thread.id, body)
            console.log(`Sent message "${id}" in thread "${thread.id}".`)
        })
}
