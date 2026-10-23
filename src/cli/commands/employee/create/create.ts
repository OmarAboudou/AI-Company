import type { Command } from "@commander-js/extra-typings"
import { registerEmployeeCreateLlmCommand } from "./llm.ts"

export function registerEmployeeCreateCommands(employeeCommand: Command): void {
    const employeeCreateCommand = employeeCommand
        .command("create")
        .alias("hire")
        .description("Create (hire) an employee, run by an LLM.")
    registerEmployeeCreateLlmCommand(employeeCreateCommand)
}
