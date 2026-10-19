import type { Command } from "@commander-js/extra-typings"
import { updateCompany } from "../../../organization/company/update-company.ts"
import { createDescriptionFileOption } from "../../create-description-file-option.ts"
import { projectRoot } from "../../project-root.ts"
import { readTextOrFile } from "../../read-text-or-file.ts"
import { requireAtLeastOneOption } from "../../require-at-least-one-option.ts"
import { requireDirector } from "../../require-director.ts"

export function registerCompanyUpdateCommand(companyCommand: Command): void {
    companyCommand
        .command("update")
        .description("Update the company: only the options given change.")
        .option("-n, --name <name>", "company name")
        .option("-d, --description <text>", "company description")
        .addOption(createDescriptionFileOption())
        .hook("preAction", requireDirector)
        .action(async (options) => {
            requireAtLeastOneOption(options)
            const description = await readTextOrFile(
                options.description,
                options.descriptionFile,
            )
            const company = await updateCompany(projectRoot, {
                name: options.name,
                description,
            })
            console.log(`Updated company "${company.name}".`)
        })
}
