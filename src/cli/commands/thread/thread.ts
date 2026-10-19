import type { Command } from "@commander-js/extra-typings"
import { registerThreadCreateCommand } from "./create.ts"
import { registerThreadListCommand } from "./list.ts"
import { registerThreadShowCommand } from "./show.ts"

export function registerThreadCommands(program: Command): void {
    const threadCommand = program
        .command("thread")
        .description(
            "Manage the company's threads, where positions exchange messages.",
        )
    registerThreadCreateCommand(threadCommand)
    registerThreadListCommand(threadCommand)
    registerThreadShowCommand(threadCommand)
}
