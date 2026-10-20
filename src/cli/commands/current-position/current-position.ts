import type { Command } from "@commander-js/extra-typings"
import { registerCurrentPositionClearCommand } from "./clear.ts"
import { registerCurrentPositionSetCommand } from "./set.ts"
import { registerCurrentPositionShowCommand } from "./show.ts"

export function registerCurrentPositionCommands(program: Command): void {
    const currentPositionCommand = program
        .command("current-position")
        .description(
            "Show or change the position you write from in this shell.",
        )
    registerCurrentPositionShowCommand(currentPositionCommand)
    registerCurrentPositionSetCommand(currentPositionCommand)
    registerCurrentPositionClearCommand(currentPositionCommand)
}
