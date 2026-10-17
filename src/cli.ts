#!/usr/bin/env bun
import { Command } from "@commander-js/extra-typings"
import { z } from "zod"
import { CompanyConfigSchema } from "./company/company.ts"
import { companyExists, loadCompany, saveCompany } from "./company/storage.ts"
import { PositionConfigSchema, PositionIdSchema } from "./position/position.ts"
import {
    listPositions,
    loadPosition,
    positionExists,
    savePosition,
} from "./position/storage.ts"

const projectRoot = process.cwd()

function fail(message: string): never {
    console.error(message)
    process.exit(1)
}

async function requireCompany(): Promise<void> {
    if (!(await companyExists(projectRoot))) {
        fail("No company in this directory. Run `llmco init` first.")
    }
}

function parsePositionId(id: string): string {
    const result = PositionIdSchema.safeParse(id)
    if (!result.success) {
        fail(`Invalid position id "${id}".\n${z.prettifyError(result.error)}`)
    }
    return result.data
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
        await requireCompany()
        const company = await loadCompany(projectRoot)
        console.log(`# ${company.name}\n\n${company.description}`)
    })

const positionCommand = program
    .command("position")
    .description("Manage the positions of the company.")

positionCommand
    .command("create")
    .description("Create a position.")
    .argument("<id>", "position id in kebab-case, e.g. backend-developer")
    .requiredOption("--title <title>", "position title")
    .option("--description <text>", "what the position is responsible for", "")
    .action(async (rawId, { title, description }) => {
        await requireCompany()
        const id = parsePositionId(rawId)
        if (await positionExists(projectRoot, id)) {
            fail(`Position "${id}" already exists.`)
        }
        const config = PositionConfigSchema.safeParse({ title })
        if (!config.success) {
            fail(z.prettifyError(config.error))
        }
        await savePosition(projectRoot, { id, ...config.data, description })
        console.log(`Created position "${id}".`)
    })

positionCommand
    .command("list")
    .description("List the positions.")
    .action(async () => {
        await requireCompany()
        const positions = await listPositions(projectRoot)
        if (positions.length === 0) {
            console.log("No positions yet. Run `llmco position create`.")
            return
        }
        const longestIdLength = Math.max(
            ...positions.map(({ id }) => id.length),
        )
        for (const { id, title } of positions) {
            console.log(`${id.padEnd(longestIdLength)}  ${title}`)
        }
    })

positionCommand
    .command("show")
    .description("Display a position title and description.")
    .argument("<id>", "position id")
    .action(async (rawId) => {
        await requireCompany()
        const id = parsePositionId(rawId)
        if (!(await positionExists(projectRoot, id))) {
            fail(`No position "${id}". Run \`llmco position list\`.`)
        }
        const position = await loadPosition(projectRoot, id)
        console.log(`# ${position.title}\n\n${position.description}`)
    })

await program.parseAsync()
