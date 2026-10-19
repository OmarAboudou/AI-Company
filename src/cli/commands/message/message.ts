import type { Command } from "@commander-js/extra-typings"
import { registerMessageSendCommand } from "./send.ts"

export function registerMessageCommands(program: Command): void {
    const messageCommand = program
        .command("message")
        .description("Write messages in the company's threads.")
    registerMessageSendCommand(messageCommand)
}
