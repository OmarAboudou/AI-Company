import { Command } from "@commander-js/extra-typings"
import { registerCompanyCommands } from "./commands/company/company.ts"
import { registerCurrentHumanCommand } from "./commands/current-human.ts"
import { registerEmployeeCommands } from "./commands/employee/employee.ts"
import { registerInitCommand } from "./commands/init.ts"
import { registerMessageCommands } from "./commands/message/message.ts"
import { registerModelCommands } from "./commands/model/model.ts"
import { registerPositionCommands } from "./commands/position/position.ts"
import { registerProviderCommands } from "./commands/provider/provider.ts"
import { registerThreadCommands } from "./commands/thread/thread.ts"

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
    registerModelCommands(program)
    registerThreadCommands(program)
    registerMessageCommands(program)
    registerCurrentHumanCommand(program)
    return program
}
