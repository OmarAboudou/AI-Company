import type { Command } from "@commander-js/extra-typings"
import { createThread } from "../../../messaging/thread/create-thread.ts"
import {
    createAsPositionOption,
    createBodyFileOption,
    createBodyOption,
} from "../../options.ts"
import { printCreatedTasks } from "../../print-created-tasks.ts"
import { printUnknownMentions } from "../../print-unknown-mentions.ts"
import { projectRoot } from "../../project-root.ts"
import { readBody } from "../../read-body.ts"

export function registerThreadCreateCommand(threadCommand: Command): void {
    threadCommand
        .command("create")
        .description(
            "Create a thread as the person at the keyboard (see current-human), and print its id. Each position its first message mentions gets a task, which `aico run` runs if an LLM employee works it.",
        )
        .requiredOption("-s, --subject <subject>", "subject of the thread")
        .addOption(createBodyOption("the thread's first message"))
        .addOption(createBodyFileOption("the thread's first message"))
        .addOption(createAsPositionOption())
        .action(async (options) => {
            const body = await readBody(options)
            const { thread, unknownMentionIds, createdTasks } =
                await createThread(projectRoot, process.env, {
                    subject: options.subject,
                    body,
                    asPositionId: options.asPosition,
                })
            console.log(thread.id)
            printUnknownMentions(unknownMentionIds)
            printCreatedTasks(createdTasks)
        })
}
