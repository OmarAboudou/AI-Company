import { type Command, Option } from "@commander-js/extra-typings"
import { formatIdArgumentDescription } from "../cli/format-id-argument-description.ts"
import { printAnswerEvent } from "../cli/print-answer-event.ts"
import { printUnknownMentions } from "../cli/print-unknown-mentions.ts"
import { projectRoot } from "../cli/project-root.ts"
import { readTextOrFile } from "../cli/read-text-or-file.ts"
import { sendMessage } from "../messaging/message/send-message.ts"
import { UserError } from "../user-error.ts"
import { answerMentions } from "../work/answer-mentions.ts"

export function bodyOption(what = "the message") {
    return new Option("-b, --body <text>", `${what}, in Markdown`)
}

export function asPositionOption() {
    return new Option(
        "-a, --as-position <position-id>",
        "position to write from, among those you work (see current-human); by default, the only one of them in the thread, else the director's or your only one",
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
    return readTextOrFile(options.body, options.bodyFile)
}

export function registerMessageCommands(program: Command): void {
    const messageCommand = program
        .command("message")
        .description("Write messages in the company's threads.")

    messageCommand
        .command("send")
        .description(
            "Send a message in a thread, as the person at the keyboard (see current-human), and print the answers of the LLM employees it mentions.",
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
            const body = await readBody(options)
            if (body === undefined) {
                throw new UserError(
                    "Give the message with -b, --body or -F, --body-file.",
                )
            }
            const { message, unknownMentionIds } = await sendMessage(
                projectRoot,
                rawThreadId,
                { body, asPositionId: options.asPosition },
            )
            printUnknownMentions(unknownMentionIds)
            console.error(
                `Sent message "${message.id}" in thread "${message.threadId}".`,
            )
            await answerMentions(
                projectRoot,
                message.threadId,
                message.mentions,
                printAnswerEvent,
            )
        })
}
