import type { Command } from "@commander-js/extra-typings"
import { registerTurnAddCommands } from "./add/add.ts"

export function registerTurnCommands(program: Command): void {
    const turnCommand = program
        .command("turn")
        .description(
            "Prepare your next turn in your task in progress (see task next), then send it, as an LLM employee's: texts and tool calls.",
        )
    registerTurnAddCommands(turnCommand)
}
