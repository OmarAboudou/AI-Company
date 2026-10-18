import type { Command } from "@commander-js/extra-typings"
import { z } from "zod"
import {
    descriptionFileOption,
    projectRoot,
    readDescription,
    requireAnOption,
    requireCompany,
    withoutUndefined,
} from "../cli-helpers.ts"
import { UserError } from "../errors.ts"
import { requireGitRepository } from "../git.ts"
import { CompanyConfigSchema } from "./company.ts"
import { companyExists, loadCompany, saveCompany } from "./storage.ts"

export function registerCompanyCommands(program: Command): void {
    program
        .command("init")
        .description("Create a company in the current git repository.")
        .requiredOption("-n, --name <name>", "company name")
        .option("-d, --description <text>", "company description", "")
        .addOption(descriptionFileOption())
        .action(async ({ name, description, descriptionFile }) => {
            requireGitRepository(projectRoot)
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
        .description("Inspect and update the company.")

    companyCommand
        .command("show")
        .description("Display the company name and description.")
        .action(async () => {
            await requireCompany()
            const company = await loadCompany(projectRoot)
            console.log(`# ${company.name}\n\n${company.description}`)
        })

    companyCommand
        .command("update")
        .description("Update the company: only the options given change.")
        .option("-n, --name <name>", "company name")
        .option("-d, --description <text>", "company description")
        .addOption(descriptionFileOption())
        .action(async (options) => {
            requireAnOption(options)
            await requireCompany()
            const [company, newDescription] = await Promise.all([
                loadCompany(projectRoot),
                readDescription(options.description, options.descriptionFile),
            ])
            const { description: currentDescription, ...current } = company
            const config = CompanyConfigSchema.safeParse({
                ...current,
                ...withoutUndefined({ name: options.name }),
            })
            if (!config.success) {
                throw new UserError(z.prettifyError(config.error))
            }
            await saveCompany(projectRoot, {
                ...config.data,
                description: newDescription ?? currentDescription,
            })
            console.log(`Updated company "${config.data.name}".`)
        })
}
