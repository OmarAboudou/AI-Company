import { Command } from "@commander-js/extra-typings"
import { registerCompanyCommands } from "./commands/company/company.ts"
import { registerCurrentHumanCommands } from "./commands/current-human/current-human.ts"
import { registerEmployeeCommands } from "./commands/employee/employee.ts"
import { registerInitCommand } from "./commands/init.ts"
import { registerMessageCommands } from "./commands/message/message.ts"
import { registerModelCommands } from "./commands/model/model.ts"
import { registerPositionCommands } from "./commands/position/position.ts"
import { registerProviderCommands } from "./commands/provider/provider.ts"
import { registerShellCommands } from "./commands/shell/shell.ts"
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
    registerCurrentHumanCommands(program)
    registerShellCommands(program)
    return program
}
