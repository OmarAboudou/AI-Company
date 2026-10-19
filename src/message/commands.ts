import { type Command, Option } from "@commander-js/extra-typings"
import { formatIdArgumentDescription } from "../cli/format-id-argument-description.ts"
import { projectRoot } from "../cli/project-root.ts"
import { readTextOrFile } from "../cli/read-text-or-file.ts"
import { loadExistingThread } from "../cli-helpers.ts"
import { requireCompany } from "../company/require-company.ts"
import { answerMentions } from "../llm/reply.ts"
import { listPositions } from "../organization/position/storage.ts"
import { UserError } from "../user-error.ts"
import { type Author, currentAuthor } from "./author.ts"
import { findMentions } from "./mentions.ts"
import {
    listMessages,
    newMessageId,
    nextSentAt,
    saveMessage,
} from "./storage.ts"

export function bodyOption(what = "the message") {
    return new Option("-b, --body <text>", `${what}, in Markdown`)
}

export function asPositionOption() {
    return new Option(
        "-a, --as-position <position-id>",
        "position to write from, among those you work (see whoami); by default, the only one of them in the thread, else the director's or your only one",
    )
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

export type Draft = Author & {
    body: string
    mentions: string[]
    unknownMentions: string[]
}

export async function readMentions(
    body: string,
    authorPositionId: string,
): Promise<Pick<Draft, "mentions" | "unknownMentions">> {
    const { positionIds } = findMentions(body)
    const positions = await listPositions(projectRoot)
    const known = new Set(positions.map(({ id }) => id))
    return {
        mentions: positionIds.filter(
            (id) => known.has(id) && id !== authorPositionId,
        ),
        unknownMentions: positionIds.filter((id) => !known.has(id)),
    }
}

export async function draftMessage(
    author: Author,
    body: string,
): Promise<Draft> {
    const { employeeMentions } = findMentions(body)
    if (employeeMentions.length > 0) {
        throw new UserError(
            `Mentioning a specific employee (${employeeMentions.join(", ")}) isn't possible yet: mention the position.`,
        )
    }
    return {
        ...author,
        body,
        ...(await readMentions(body, author.position.id)),
    }
}

export async function sendDraft(
    threadId: string,
    { unknownMentions, ...draft }: Draft,
): Promise<string> {
    const messages = await listMessages(projectRoot, threadId)
    const sentAt = nextSentAt(messages, new Date())
    const id = newMessageId(sentAt)
    await saveMessage(projectRoot, { threadId, id, ...draft, sentAt })
    for (const positionId of unknownMentions) {
        console.error(
            `"@${positionId}" names no position, so it mentions nobody.`,
        )
    }
    return id
}

export function registerMessageCommands(program: Command): void {
    const messageCommand = program
        .command("message")
        .description("Write messages in the company's threads.")

    messageCommand
        .command("send")
        .description(
            "Send a message in a thread, as the person at the keyboard (see whoami), and print the answers of the LLM employees it mentions.",
        )
        .argument(
            "<thread-id>",
            formatIdArgumentDescription(
                "thread",
                "2026-10-18-choice-of-framework",
            ),
        )
        .addOption(bodyOption())
        .addOption(bodyFileOption())
        .addOption(asPositionOption())
        .action(async (rawThreadId, options) => {
            await requireCompany(projectRoot)
            const thread = await loadExistingThread(rawThreadId)
            const body = await readBody(options)
            if (body === undefined) {
                throw new UserError(
                    "Give the message with -b, --body or -F, --body-file.",
                )
            }
            const messages = await listMessages(projectRoot, thread.id)
            const author = await currentAuthor({
                archive: { thread, messages },
                asPositionId: options.asPosition,
            })
            const draft = await draftMessage(author, body)
            const id = await sendDraft(thread.id, draft)
            console.error(`Sent message "${id}" in thread "${thread.id}".`)
            await answerMentions(thread.id, draft.mentions)
        })
}
