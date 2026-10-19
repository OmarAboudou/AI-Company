import type { Command } from "@commander-js/extra-typings"
import { requireDirector } from "../../../require-director.ts"
import { registerEmployeeCreateHumanCommand } from "./human.ts"
import { registerEmployeeCreateLlmCommand } from "./llm.ts"

export function registerEmployeeCreateCommands(employeeCommand: Command): void {
    const employeeCreateCommand = employeeCommand
        .command("create")
        .alias("hire")
        .description("Create (hire) an employee: an LLM or a human.")
        .hook("preAction", requireDirector)
    registerEmployeeCreateLlmCommand(employeeCreateCommand)
    registerEmployeeCreateHumanCommand(employeeCreateCommand)
}
