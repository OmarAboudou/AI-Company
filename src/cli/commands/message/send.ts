import type { Command } from "@commander-js/extra-typings"
import { sendMessage } from "../../../messaging/message/send-message.ts"
import { UserError } from "../../../user-error.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import {
    createAsPositionOption,
    createBodyFileOption,
    createBodyOption,
} from "../../options.ts"
import { printCreatedTasks } from "../../print-created-tasks.ts"
import { projectRoot } from "../../project-root.ts"
import { readBody } from "../../read-body.ts"

export function registerMessageSendCommand(messageCommand: Command): void {
    messageCommand
        .command("send")
        .description(
            "Send a message in a thread, as the person at the keyboard (see current-human).",
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
            const { message, createdTasks } = await sendMessage(
                projectRoot,
                process.env,
                rawThreadId,
                { body, asPositionId: options.asPosition },
            )
            console.error(
                `Sent message "${message.id}" in thread "${message.threadId}".`,
            )
            printCreatedTasks(createdTasks)
        })
}
