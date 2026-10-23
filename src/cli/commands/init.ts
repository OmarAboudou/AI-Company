import type { Command } from "@commander-js/extra-typings"
import { createCompany } from "../../organization/company/create-company.ts"
import { createDescriptionFileOption } from "../options.ts"
import { projectRoot } from "../project-root.ts"
import { readTextOrFile } from "../read-text-or-file.ts"

export function registerInitCommand(program: Command): void {
    program
        .command("init")
        .description(
            "Create a company in the current git repository, with its director's position.",
        )
        .requiredOption("-n, --name <name>", "company name")
        .option(
            "-d, --description <text>",
            "description of the project the company carries out",
            "",
        )
        .addOption(createDescriptionFileOption())
        .action(async (options) => {
            const projectDescription = await readTextOrFile(
                options.description,
                options.descriptionFile,
            )
            const company = await createCompany(projectRoot, {
                name: options.name,
                projectDescription,
            })
            console.log(
                `Created company "${company.name}" and its director's position "${company.directorPositionId}".`,
            )
        })
}
