import type { Command } from "@commander-js/extra-typings"
import { updateCompany } from "../../../organization/company/update-company.ts"
import { projectRoot } from "../../project-root.ts"
import { requireAtLeastOneOption } from "../../require-at-least-one-option.ts"
import { runCommandOperation } from "../../run-command-operation.ts"

export function registerCompanyUpdateCommand(companyCommand: Command): void {
    companyCommand
        .command("update")
        .description("Update the company: only the options given change.")
        .option("-n, --name <name>", "company name")
        .action(async (options, command) => {
            requireAtLeastOneOption(options)
            const company = await runCommandOperation(command, () =>
                updateCompany(projectRoot, { name: options.name }),
            )
            console.log(`Updated company "${company.name}".`)
        })
}
