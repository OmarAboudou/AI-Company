import type { Command } from "@commander-js/extra-typings"
import { formatDateTime } from "../../../format-date-time.ts"
import { listEvents } from "../../../journal/storage.ts"
import { requireCompany } from "../../../organization/company/require-company.ts"
import { loadCompany } from "../../../organization/company/storage.ts"
import { getCompanyPause } from "../../../work/pause/get-company-pause.ts"
import { projectRoot } from "../../project-root.ts"

export function registerCompanyShowCommand(companyCommand: Command): void {
    companyCommand
        .command("show")
        .description("Display the company's name, and whether it is paused.")
        .action(async () => {
            await requireCompany(projectRoot)
            const [company, events] = await Promise.all([
                loadCompany(projectRoot),
                listEvents(projectRoot),
            ])
            console.log(`# ${company.name}`)
            const pause = getCompanyPause(events)
            if (pause !== undefined) {
                console.log(
                    `\nPaused since ${formatDateTime(pause.pausedAt)}: \`aico company relaunch\` relaunches it.`,
                )
            }
        })
}
