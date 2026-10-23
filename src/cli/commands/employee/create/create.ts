import type { Command } from "@commander-js/extra-typings"
import { registerEmployeeCreateHumanCommand } from "./human.ts"
import { registerEmployeeCreateLlmCommand } from "./llm.ts"

export function registerEmployeeCreateCommands(employeeCommand: Command): void {
    const employeeCreateCommand = employeeCommand
        .command("create")
        .alias("hire")
        .description("Create (hire) an employee: an LLM or a human.")
    registerEmployeeCreateLlmCommand(employeeCreateCommand)
    registerEmployeeCreateHumanCommand(employeeCreateCommand)
}
