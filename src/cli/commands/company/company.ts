import type { Command } from "@commander-js/extra-typings"
import { registerCompanyPauseCommand } from "./pause.ts"
import { registerCompanyRelaunchCommand } from "./relaunch.ts"
import { registerCompanyShowCommand } from "./show.ts"
import { registerCompanyUpdateCommand } from "./update.ts"

export function registerCompanyCommands(program: Command): void {
    const companyCommand = program
        .command("company")
        .description("Inspect, update, pause and relaunch the company.")
    registerCompanyShowCommand(companyCommand)
    registerCompanyUpdateCommand(companyCommand)
    registerCompanyPauseCommand(companyCommand)
    registerCompanyRelaunchCommand(companyCommand)
}
