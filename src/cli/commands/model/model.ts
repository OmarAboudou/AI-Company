import type { Command } from "@commander-js/extra-typings"
import { registerModelCreateCommand } from "./create.ts"
import { registerModelDeleteCommand } from "./delete.ts"
import { registerModelListCommand } from "./list.ts"
import { registerModelShowCommand } from "./show.ts"
import { registerModelUpdateCommand } from "./update.ts"
import { registerModelUpdateIdCommand } from "./update-id.ts"

export function registerLlmModelCommands(program: Command): void {
    const modelCommand = program
        .command("model")
        .description("Manage the models served by the LLM providers.")
    registerModelCreateCommand(modelCommand)
    registerModelListCommand(modelCommand)
    registerModelShowCommand(modelCommand)
    registerModelUpdateCommand(modelCommand)
    registerModelUpdateIdCommand(modelCommand)
    registerModelDeleteCommand(modelCommand)
}
