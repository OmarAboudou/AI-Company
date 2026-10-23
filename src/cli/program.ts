import { Command } from "@commander-js/extra-typings"
import { registerCompanyCommands } from "./commands/company/company.ts"
import { registerCurrentPositionCommands } from "./commands/current-position/current-position.ts"
import { registerEmployeeCommands } from "./commands/employee/employee.ts"
import { registerInitCommand } from "./commands/init.ts"
import { registerModelCommands } from "./commands/model/model.ts"
import { registerPositionCommands } from "./commands/position/position.ts"
import { registerProjectCommands } from "./commands/project/project.ts"
import { registerProviderCommands } from "./commands/provider/provider.ts"
import { registerRunCommand } from "./commands/run.ts"
import { registerShellCommands } from "./commands/shell/shell.ts"
import { registerTaskCommands } from "./commands/task/task.ts"
import { registerTurnCommands } from "./commands/turn/turn.ts"

export function createProgram(): Command {
    const program = new Command()
        .name("aico")
        .description("Run a virtual company staffed by LLM agents.")
        .showHelpAfterError()
    registerInitCommand(program)
    registerCompanyCommands(program)
    registerProjectCommands(program)
    registerPositionCommands(program)
    registerEmployeeCommands(program)
    registerProviderCommands(program)
    registerModelCommands(program)
    registerRunCommand(program)
    registerTaskCommands(program)
    registerTurnCommands(program)
    registerCurrentPositionCommands(program)
    registerShellCommands(program)
    return program
}
