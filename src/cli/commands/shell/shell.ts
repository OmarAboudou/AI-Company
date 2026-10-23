import type { Command } from "@commander-js/extra-typings"
import { registerShellInitCommand } from "./init.ts"

export function registerShellCommands(program: Command): void {
    const shellCommand = program
        .command("shell")
        .description(
            "Set up AICo's shell function, which current-position set and clear need.",
        )
    registerShellInitCommand(shellCommand)
}
