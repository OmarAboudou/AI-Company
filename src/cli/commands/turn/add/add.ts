import type { Command } from "@commander-js/extra-typings"
import { registerTurnAddTextCommand } from "./text.ts"
import { registerTurnAddToolCommand } from "./tool.ts"

export function registerTurnAddCommands(turnCommand: Command): void {
    const turnAddCommand = turnCommand
        .command("add")
        .description("Add a text or a tool call to your next turn.")
    registerTurnAddTextCommand(turnAddCommand)
    registerTurnAddToolCommand(turnAddCommand)
}
