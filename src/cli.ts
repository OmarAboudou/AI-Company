#!/usr/bin/env bun
import { parseArgs } from "node:util"
import { z } from "zod"
import { CompanyConfigSchema } from "./company/company.ts"
import { companyExists, loadCompany, saveCompany } from "./company/storage.ts"

const USAGE = `Usage:
  llmco init --name <name> [--description <text>]
  llmco company show`

function fail(message: string): never {
    console.error(message)
    process.exit(1)
}

const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
        name: { type: "string" },
        description: { type: "string", default: "" },
    },
    allowPositionals: true,
})

const projectRoot = process.cwd()

switch (positionals.join(" ")) {
    case "init": {
        if (await companyExists(projectRoot)) {
            fail("A company already exists in this directory.")
        }
        const config = CompanyConfigSchema.safeParse({ name: values.name })
        if (!config.success) {
            fail(z.prettifyError(config.error))
        }
        await saveCompany(projectRoot, {
            ...config.data,
            description: values.description,
        })
        console.log(`Created company "${config.data.name}".`)
        break
    }
    case "company show": {
        if (!(await companyExists(projectRoot))) {
            fail("No company in this directory. Run `llmco init` first.")
        }
        const company = await loadCompany(projectRoot)
        console.log(`# ${company.name}\n\n${company.description}`)
        break
    }
    default:
        fail(USAGE)
}
