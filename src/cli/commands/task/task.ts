import type { Command } from "@commander-js/extra-typings"
import { registerTaskNextCommand } from "./next.ts"
import { registerTaskWorkCommand } from "./work.ts"

export function registerTaskCommands(program: Command): void {
    const taskCommand = program
        .command("task")
        .description(
            "Work the tasks of the positions you work, as LLM employees do: the same message, the same tools, turn by turn.",
        )
    registerTaskNextCommand(taskCommand)
    registerTaskWorkCommand(taskCommand)
}
