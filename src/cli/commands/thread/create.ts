import type { Command } from "@commander-js/extra-typings"
import { createThread } from "../../../messaging/thread/create-thread.ts"
import { answerMentions } from "../../../work/answer-mentions.ts"
import { asPositionOption } from "../../create-as-position-option.ts"
import { bodyFileOption } from "../../create-body-file-option.ts"
import { bodyOption } from "../../create-body-option.ts"
import { printAnswerEvent } from "../../print-answer-event.ts"
import { printUnknownMentions } from "../../print-unknown-mentions.ts"
import { projectRoot } from "../../project-root.ts"
import { readBody } from "../../read-body.ts"

export function registerThreadCreateCommand(threadCommand: Command): void {
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
}
