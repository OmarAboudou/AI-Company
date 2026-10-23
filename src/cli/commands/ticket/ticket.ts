import type { Command } from "@commander-js/extra-typings"
import { registerTicketListCommand } from "./list.ts"
import { registerTicketShowCommand } from "./show.ts"

export function registerTicketCommands(program: Command): void {
    const ticketCommand = program
        .command("ticket")
        .description(
            "Read the company's tickets, the requests positions address each other, with their discussions.",
        )
    registerTicketListCommand(ticketCommand)
    registerTicketShowCommand(ticketCommand)
}
