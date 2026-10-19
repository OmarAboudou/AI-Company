import { Command } from "@commander-js/extra-typings"
import { registerCompanyCommands } from "./company/commands.ts"
import { registerEmployeeCommands } from "./employee/commands.ts"
import { registerHumanCommands } from "./human/commands.ts"
import { registerLlmModelCommands } from "./llm-model/commands.ts"
import { registerLlmProviderCommands } from "./llm-provider/commands.ts"
import { registerMessageCommands } from "./message/commands.ts"
import { registerPositionCommands } from "./position/commands.ts"
import { registerThreadCommands } from "./thread/commands.ts"

export function createProgram(): Command {
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
    return program
}
