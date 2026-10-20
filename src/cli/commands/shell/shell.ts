import type { Command } from "@commander-js/extra-typings"
import { registerShellInitCommand } from "./init.ts"

export function registerShellCommands(program: Command): void {
    const shellCommand = program
        .command("shell")
        .description(
            "Set up llmco's shell function, which current-human set and clear need.",
        )
    registerShellInitCommand(shellCommand)
}
