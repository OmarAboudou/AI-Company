import { Command } from "@commander-js/extra-typings"
import { registerCompanyCommands } from "../company/commands.ts"
import { registerLlmModelCommands } from "../llm-model/commands.ts"
import { registerLlmProviderCommands } from "../llm-provider/commands.ts"
import { registerMessageCommands } from "../message/commands.ts"
import { registerThreadCommands } from "../thread/commands.ts"
import { registerEmployeeCommands } from "./commands/employee/employee.ts"
import { registerPositionCommands } from "./commands/position/position.ts"
import { registerWhoamiCommand } from "./commands/whoami.ts"

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
    registerWhoamiCommand(program)
    return program
}
