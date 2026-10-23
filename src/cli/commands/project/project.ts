import type { Command } from "@commander-js/extra-typings"
import { registerProjectShowCommand } from "./show.ts"
import { registerProjectUpdateCommand } from "./update.ts"

export function registerProjectCommands(program: Command): void {
    const projectCommand = program
        .command("project")
        .description(
            "Inspect and update the project the company carries out, whose description every session is given.",
        )
    registerProjectShowCommand(projectCommand)
    registerProjectUpdateCommand(projectCommand)
}
