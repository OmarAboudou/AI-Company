import type { Command } from "@commander-js/extra-typings"
import { createCompany } from "../../organization/company/create-company.ts"
import { createDescriptionFileOption } from "../create-description-file-option.ts"
import { projectRoot } from "../project-root.ts"
import { readTextOrFile } from "../read-text-or-file.ts"
import { requireDirector } from "../require-director.ts"

export function registerInitCommand(program: Command): void {
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
}
