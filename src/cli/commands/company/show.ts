import type { Command } from "@commander-js/extra-typings"
import { requireCompany } from "../../../organization/company/require-company.ts"
import { loadCompany } from "../../../organization/company/storage.ts"
import { projectRoot } from "../../project-root.ts"

export function registerCompanyShowCommand(companyCommand: Command): void {
    companyCommand
        .command("show")
        .description("Display the company name and description.")
        .action(async () => {
            await requireCompany(projectRoot)
            const company = await loadCompany(projectRoot)
            console.log(`# ${company.name}\n\n${company.description}`)
        })
}
