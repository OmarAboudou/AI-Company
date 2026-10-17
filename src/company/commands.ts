import type { Command } from "@commander-js/extra-typings"
import { z } from "zod"
import {
    descriptionFileOption,
    projectRoot,
    readDescription,
    requireCompany,
} from "../cli-helpers.ts"
import { UserError } from "../errors.ts"
import { CompanyConfigSchema } from "./company.ts"
import { companyExists, loadCompany, saveCompany } from "./storage.ts"

export function registerCompanyCommands(program: Command): void {
    program
        .command("init")
        .description("Create a company in the current directory.")
        .requiredOption("-n, --name <name>", "company name")
        .option("-d, --description <text>", "company description", "")
        .addOption(descriptionFileOption())
        .action(async ({ name, description, descriptionFile }) => {
            if (await companyExists(projectRoot)) {
                throw new UserError(
                    "A company already exists in this directory.",
                )
            }
            const config = CompanyConfigSchema.safeParse({ name })
            if (!config.success) {
                throw new UserError(z.prettifyError(config.error))
            }
            await saveCompany(projectRoot, {
                ...config.data,
                description: await readDescription(
                    description,
                    descriptionFile,
                ),
            })
            console.log(`Created company "${config.data.name}".`)
        })

    const companyCommand = program
        .command("company")
        .description("Inspect the company.")

    companyCommand
        .command("show")
        .description("Display the company name and description.")
        .action(async () => {
            await requireCompany()
            const company = await loadCompany(projectRoot)
            console.log(`# ${company.name}\n\n${company.description}`)
        })
}
