import type { Command } from "@commander-js/extra-typings"
import { sendMessage } from "../../../messaging/message/send-message.ts"
import { UserError } from "../../../user-error.ts"
import { answerMentions } from "../../../work/answer-mentions.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import {
    createAsPositionOption,
    createBodyFileOption,
    createBodyOption,
} from "../../options.ts"
import { printAnswerEvent } from "../../print-answer-event.ts"
import { printUnknownMentions } from "../../print-unknown-mentions.ts"
import { projectRoot } from "../../project-root.ts"
import { readBody } from "../../read-body.ts"

export function registerMessageSendCommand(messageCommand: Command): void {
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
        .addOption(createBodyOption())
        .addOption(createBodyFileOption())
        .addOption(createAsPositionOption())
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
