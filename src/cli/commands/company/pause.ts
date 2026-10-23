import type { Command } from "@commander-js/extra-typings"
import { loadJournal } from "../../../journal/storage.ts"
import { pauseCompany } from "../../../work/pause/pause-company.ts"
import { projectRoot } from "../../project-root.ts"
import { runCommandOperation } from "../../run-command-operation.ts"

export function registerCompanyPauseCommand(companyCommand: Command): void {
    companyCommand
        .command("pause")
        .description(
            "Pause the company: no new task starts but the director's until you relaunch it, while the running sessions finish.",
        )
        .action(async (_options, command) => {
            await runCommandOperation(command, async () =>
                pauseCompany(await loadJournal(projectRoot)),
            )
            console.log(
                "Paused the company: no new task starts but the director's until `aico company relaunch`.",
            )
        })
}
