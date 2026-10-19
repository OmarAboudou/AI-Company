import type { Command } from "@commander-js/extra-typings"
import { registerLlmConnectionCommands } from "./connection/connection.ts"
import { registerProviderCreateCommand } from "./create.ts"
import { registerProviderDeleteCommand } from "./delete.ts"
import { registerProviderListCommand } from "./list.ts"
import { registerProviderShowCommand } from "./show.ts"
import { registerProviderUpdateCommand } from "./update.ts"
import { registerProviderUpdateIdCommand } from "./update-id.ts"

export function registerLlmProviderCommands(program: Command): void {
    const providerCommand = program
        .command("provider")
        .description("Manage the LLM providers serving models to the company.")
    registerProviderCreateCommand(providerCommand)
    registerProviderListCommand(providerCommand)
    registerProviderShowCommand(providerCommand)
    registerProviderUpdateCommand(providerCommand)
    registerProviderUpdateIdCommand(providerCommand)
    registerProviderDeleteCommand(providerCommand)
    registerLlmConnectionCommands(providerCommand)
}
