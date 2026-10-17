#!/usr/bin/env bun
import { Command, Option } from "@commander-js/extra-typings"
import { z } from "zod"
import { CompanyConfigSchema } from "./company/company.ts"
import { companyExists, loadCompany, saveCompany } from "./company/storage.ts"
import { UserError } from "./errors.ts"
import { readText } from "./files.ts"
import { IdSchema } from "./id.ts"
import { PositionConfigSchema } from "./position/position.ts"
import {
    listPositions,
    loadPosition,
    positionExists,
    savePosition,
} from "./position/storage.ts"

const projectRoot = process.cwd()

async function requireCompany(): Promise<void> {
    if (!(await companyExists(projectRoot))) {
        throw new UserError(
            "No company in this directory. Run `llmco init` first.",
        )
    }
}

function descriptionFileOption() {
    return new Option(
        "-F, --description-file <path>",
        "read the description from a file, or from stdin with -",
    ).conflicts("description")
}

async function readDescription(
    description: string,
    descriptionFile: string | undefined,
): Promise<string> {
    if (descriptionFile === undefined) {
        return description
    }
    if (descriptionFile === "-") {
        return Bun.stdin.text()
    }
    return readText(projectRoot, descriptionFile)
}

function parseId(entity: string, id: string): string {
    const result = IdSchema.safeParse(id)
    if (!result.success) {
        throw new UserError(
            `Invalid ${entity} id "${id}".\n${z.prettifyError(result.error)}`,
        )
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
    .requiredOption("-n, --name <name>", "company name")
    .option("-d, --description <text>", "company description", "")
    .addOption(descriptionFileOption())
    .action(async ({ name, description, descriptionFile }) => {
        if (await companyExists(projectRoot)) {
            throw new UserError("A company already exists in this directory.")
        }
        const config = CompanyConfigSchema.safeParse({ name })
        if (!config.success) {
            throw new UserError(z.prettifyError(config.error))
        }
        await saveCompany(projectRoot, {
            ...config.data,
            description: await readDescription(description, descriptionFile),
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

const positionCommand = program
    .command("position")
    .description("Manage the positions of the company.")

positionCommand
    .command("create")
    .description("Create a position.")
    .argument("<id>", "position id in kebab-case, e.g. backend-developer")
    .requiredOption("-t, --title <title>", "position title")
    .option(
        "-d, --description <text>",
        "what the position is responsible for",
        "",
    )
    .addOption(descriptionFileOption())
    .action(async (rawId, { title, description, descriptionFile }) => {
        await requireCompany()
        const id = parseId("position", rawId)
        if (await positionExists(projectRoot, id)) {
            throw new UserError(`Position "${id}" already exists.`)
        }
        const config = PositionConfigSchema.safeParse({ title })
        if (!config.success) {
            throw new UserError(z.prettifyError(config.error))
        }
        await savePosition(projectRoot, {
            id,
            ...config.data,
            description: await readDescription(description, descriptionFile),
        })
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
        const id = parseId("position", rawId)
        if (!(await positionExists(projectRoot, id))) {
            throw new UserError(
                `No position "${id}". Run \`llmco position list\`.`,
            )
        }
        const position = await loadPosition(projectRoot, id)
        console.log(`# ${position.title}\n\n${position.description}`)
    })

try {
    await program.parseAsync()
} catch (error) {
    if (!(error instanceof UserError)) {
        throw error
    }
    console.error(error.message)
    process.exitCode = 1
}
