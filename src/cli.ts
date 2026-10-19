#!/usr/bin/env bun
import { Command } from "@commander-js/extra-typings"
import { registerCompanyCommands } from "./company/commands.ts"
import { registerEmployeeCommands } from "./employee/commands.ts"
import { UserError } from "./errors.ts"
import { registerHumanCommands } from "./human/commands.ts"
import { registerLlmModelCommands } from "./llm-model/commands.ts"
import { registerLlmProviderCommands } from "./llm-provider/commands.ts"
import { registerMessageCommands } from "./message/commands.ts"
import { registerPositionCommands } from "./position/commands.ts"
import { registerThreadCommands } from "./thread/commands.ts"

const program = new Command()
    .name("llmco")
    .description("Run a virtual company staffed by LLM agents.")
    .showHelpAfterError()

registerCompanyCommands(program)
registerPositionCommands(program)
registerEmployeeCommands(program)
registerLlmProviderCommands(program)
registerLlmModelCommands(program)
registerThreadCommands(program)
registerMessageCommands(program)
registerHumanCommands(program)

try {
    await program.parseAsync()
} catch (error) {
    if (!(error instanceof UserError)) {
        throw error
    }
    console.error(error.message)
    process.exitCode = 1
}
