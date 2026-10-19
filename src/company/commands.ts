import type { Command } from "@commander-js/extra-typings"
import { createDescriptionFileOption } from "../cli/create-description-file-option.ts"
import { projectRoot } from "../cli/project-root.ts"
import { readTextOrFile } from "../cli/read-text-or-file.ts"
import { requireAtLeastOneOption } from "../cli/require-at-least-one-option.ts"
import { requireDirector } from "../cli/require-director.ts"
import { createCompany } from "../organization/company/create-company.ts"
import { requireCompany } from "../organization/company/require-company.ts"
import { loadCompany } from "../organization/company/storage.ts"
import { updateCompany } from "../organization/company/update-company.ts"

export function registerCompanyCommands(program: Command): void {
    program
        .command("init")
        .description(
            "Create a company in the current git repository, with its director's position.",
        )
        .requiredOption("-n, --name <name>", "company name")
        .option("-d, --description <text>", "company description", "")
        .addOption(createDescriptionFileOption())
        .hook("preAction", requireDirector)
        .action(async (options) => {
            const description = await readTextOrFile(
                options.description,
                options.descriptionFile,
            )
            const company = await createCompany(projectRoot, {
                name: options.name,
                description,
            })
            console.log(
                `Created company "${company.name}" and its director's position "${company.directorPositionId}".`,
            )
        })

    const companyCommand = program
        .command("company")
        .description("Inspect and update the company.")

    companyCommand
        .command("show")
        .description("Display the company name and description.")
        .action(async () => {
            await requireCompany(projectRoot)
            const company = await loadCompany(projectRoot)
            console.log(`# ${company.name}\n\n${company.description}`)
        })

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
