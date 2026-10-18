import type { Command } from "@commander-js/extra-typings"
import { z } from "zod"
import {
    descriptionFileOption,
    projectRoot,
    readTextOrFile,
    requireAnOption,
    requireCompany,
    withoutUndefined,
} from "../cli-helpers.ts"
import { UserError } from "../errors.ts"
import { requireGitRepository } from "../git.ts"
import { savePosition } from "../position/storage.ts"
import { CompanyConfigSchema } from "./company.ts"
import { companyExists, loadCompany, saveCompany } from "./storage.ts"

const directorPositionId = "director"

export function registerCompanyCommands(program: Command): void {
    program
        .command("init")
        .description(
            "Create a company in the current git repository, with its director's position.",
        )
        .requiredOption("-n, --name <name>", "company name")
        .option("-d, --description <text>", "company description", "")
        .addOption(descriptionFileOption())
        .action(async (options) => {
            requireGitRepository(projectRoot)
            if (await companyExists(projectRoot)) {
                throw new UserError(
                    "A company already exists in this directory.",
                )
            }
            const config = CompanyConfigSchema.safeParse({
                name: options.name,
                directorPositionId,
            })
            if (!config.success) {
                throw new UserError(z.prettifyError(config.error))
            }
            const description = await readTextOrFile(
                options.description,
                options.descriptionFile,
            )
            await savePosition(projectRoot, {
                id: directorPositionId,
                title: "Director",
                description: "",
            })
            // The company comes last: until its config.json exists, llmco
            // sees no company, so an interrupted init can be run again.
            await saveCompany(projectRoot, { ...config.data, description })
            console.log(
                `Created company "${config.data.name}" and its director's position "${directorPositionId}".`,
            )
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
                readTextOrFile(options.description, options.descriptionFile),
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
