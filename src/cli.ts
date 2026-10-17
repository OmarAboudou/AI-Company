#!/usr/bin/env bun
import { Command } from "@commander-js/extra-typings"
import { z } from "zod"
import { CompanyConfigSchema } from "./company/company.ts"
import { companyExists, loadCompany, saveCompany } from "./company/storage.ts"

const projectRoot = process.cwd()

function fail(message: string): never {
    console.error(message)
    process.exit(1)
}

const program = new Command()
    .name("llmco")
    .description("Run a virtual company staffed by LLM agents.")
    .showHelpAfterError()

program
    .command("init")
    .description("Create a company in the current directory.")
    .requiredOption("--name <name>", "company name")
    .option("--description <text>", "company description", "")
    .action(async ({ name, description }) => {
        if (await companyExists(projectRoot)) {
            fail("A company already exists in this directory.")
        }
        const config = CompanyConfigSchema.safeParse({ name })
        if (!config.success) {
            fail(z.prettifyError(config.error))
        }
        await saveCompany(projectRoot, { ...config.data, description })
        console.log(`Created company "${config.data.name}".`)
    })

const companyCommand = program
    .command("company")
    .description("Inspect the company.")

companyCommand
    .command("show")
    .description("Display the company name and description.")
    .action(async () => {
        if (!(await companyExists(projectRoot))) {
            fail("No company in this directory. Run `llmco init` first.")
        }
        const company = await loadCompany(projectRoot)
        console.log(`# ${company.name}\n\n${company.description}`)
    })

await program.parseAsync()
