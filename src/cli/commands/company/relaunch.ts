import type { Command } from "@commander-js/extra-typings"
import { loadJournal } from "../../../journal/storage.ts"
import { relaunchCompany } from "../../../work/pause/relaunch-company.ts"
import { projectRoot } from "../../project-root.ts"
import { runCommandOperation } from "../../run-command-operation.ts"

export function registerCompanyRelaunchCommand(companyCommand: Command): void {
    companyCommand
        .command("relaunch")
        .description("Relaunch the paused company: its tasks start again.")
        .action(async (_options, command) => {
            await runCommandOperation(command, async () =>
                relaunchCompany(await loadJournal(projectRoot)),
            )
            console.log("Relaunched the company: its tasks start again.")
        })
}
