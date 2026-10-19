import { Command } from "@commander-js/extra-typings"
import { registerLlmModelCommands } from "../llm-model/commands.ts"
import { registerMessageCommands } from "../message/commands.ts"
import { registerThreadCommands } from "../thread/commands.ts"
import { registerCompanyCommands } from "./commands/company/company.ts"
import { registerCurrentHumanCommand } from "./commands/current-human.ts"
import { registerEmployeeCommands } from "./commands/employee/employee.ts"
import { registerInitCommand } from "./commands/init.ts"
import { registerPositionCommands } from "./commands/position/position.ts"
import { registerProviderCommands } from "./commands/provider/provider.ts"

export function createProgram(): Command {
    const program = new Command()
        .name("llmco")
        .description("Run a virtual company staffed by LLM agents.")
        .showHelpAfterError()
    registerInitCommand(program)
    registerCompanyCommands(program)
    registerPositionCommands(program)
    registerEmployeeCommands(program)
    registerProviderCommands(program)
    registerLlmModelCommands(program)
    registerThreadCommands(program)
    registerMessageCommands(program)
    registerCurrentHumanCommand(program)
    return program
}
