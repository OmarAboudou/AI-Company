import type { Command } from "@commander-js/extra-typings"
import { registerEmployeeCreateCommands } from "./create/create.ts"
import { registerEmployeeDeleteCommand } from "./delete.ts"
import { registerEmployeeListCommand } from "./list.ts"
import { registerEmployeeReplaceCommand } from "./replace.ts"
import { registerEmployeeShowCommand } from "./show.ts"
import { registerEmployeeUpdateCommand } from "./update.ts"
import { registerEmployeeUpdateIdCommand } from "./update-id.ts"

export function registerEmployeeCommands(program: Command): void {
    const employeeCommand = program
        .command("employee")
        .description("Manage the employees of the company.")
    registerEmployeeCreateCommands(employeeCommand)
    registerEmployeeListCommand(employeeCommand)
    registerEmployeeShowCommand(employeeCommand)
    registerEmployeeUpdateCommand(employeeCommand)
    registerEmployeeUpdateIdCommand(employeeCommand)
    registerEmployeeReplaceCommand(employeeCommand)
    registerEmployeeDeleteCommand(employeeCommand)
}
