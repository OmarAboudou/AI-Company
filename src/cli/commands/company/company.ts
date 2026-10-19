import type { Command } from "@commander-js/extra-typings"
import { registerCompanyShowCommand } from "./show.ts"
import { registerCompanyUpdateCommand } from "./update.ts"

export function registerCompanyCommands(program: Command): void {
    const companyCommand = program
        .command("company")
        .description("Inspect and update the company.")
    registerCompanyShowCommand(companyCommand)
    registerCompanyUpdateCommand(companyCommand)
}
