import type { Command } from "@commander-js/extra-typings"
import { registerProviderConnectionCreateCommand } from "./create.ts"
import { registerProviderConnectionDeleteCommand } from "./delete.ts"
import { registerProviderConnectionListCommand } from "./list.ts"
import { registerProviderConnectionUpdateCommand } from "./update.ts"

export function registerLlmConnectionCommands(providerCommand: Command): void {
    const connectionCommand = providerCommand
        .command("connection")
        .description(
            "Manage how providers are reached: one connection per API protocol.",
        )
    registerProviderConnectionCreateCommand(connectionCommand)
    registerProviderConnectionListCommand(connectionCommand)
    registerProviderConnectionUpdateCommand(connectionCommand)
    registerProviderConnectionDeleteCommand(connectionCommand)
}
