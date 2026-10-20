import type { Command } from "@commander-js/extra-typings"
import { registerCurrentHumanClearCommand } from "./clear.ts"
import { registerCurrentHumanSetCommand } from "./set.ts"
import { registerCurrentHumanShowCommand } from "./show.ts"

export function registerCurrentHumanCommands(program: Command): void {
    const currentHumanCommand = program
        .command("current-human")
        .alias("whoami")
        .description(
            "Show who is at the keyboard in this shell, or change it: a director, or a fictitious human employee.",
        )
    registerCurrentHumanShowCommand(currentHumanCommand)
    registerCurrentHumanSetCommand(currentHumanCommand)
    registerCurrentHumanClearCommand(currentHumanCommand)
}
