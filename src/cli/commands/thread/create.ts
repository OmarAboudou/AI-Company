import type { Command } from "@commander-js/extra-typings"
import { createThread } from "../../../messaging/thread/create-thread.ts"
import {
    createAsPositionOption,
    createBodyFileOption,
    createBodyOption,
} from "../../options.ts"
import { printCreatedTasks } from "../../print-created-tasks.ts"
import { projectRoot } from "../../project-root.ts"
import { readBody } from "../../read-body.ts"

export function registerThreadCreateCommand(threadCommand: Command): void {
    threadCommand
        .command("create")
        .description(
            "Create a thread from a position you work (see current-position), and print its id.",
        )
        .requiredOption("-s, --subject <subject>", "subject of the thread")
        .addOption(createBodyOption("the thread's first message"))
        .addOption(createBodyFileOption("the thread's first message"))
        .addOption(createAsPositionOption())
        .action(async (options) => {
            const body = await readBody(options)
            const { thread, createdTasks } = await createThread(
                projectRoot,
                process.env,
                {
                    subject: options.subject,
                    body,
                    asPositionId: options.asPosition,
                },
            )
            console.log(thread.id)
            printCreatedTasks(createdTasks)
        })
}
