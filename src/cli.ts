#!/usr/bin/env bun
import { Command, Option } from "@commander-js/extra-typings"
import { z } from "zod"
import { CompanyConfigSchema } from "./company/company.ts"
import { companyExists, loadCompany, saveCompany } from "./company/storage.ts"
import { type Employee, EmployeeConfigSchema } from "./employee/employee.ts"
import {
    employeeExists,
    listEmployees,
    loadEmployee,
    saveEmployee,
} from "./employee/storage.ts"
import { UserError } from "./errors.ts"
import { readText } from "./files.ts"
import { IdSchema } from "./id.ts"
import { type Position, PositionConfigSchema } from "./position/position.ts"
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

function idDescription(
    entity: "position" | "employee",
    example: string,
): string {
    return `${entity} id, which is also the name of its folder in .llmco/${entity}s (kebab-case, e.g. ${example})`
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

function printColumns(rows: string[][]): void {
    const columnWidths: number[] = []
    for (const row of rows) {
        row.forEach((cell, column) => {
            columnWidths[column] = Math.max(
                columnWidths[column] ?? 0,
                cell.length,
            )
        })
    }
    for (const row of rows) {
        const cells = row.map((cell, column) =>
            column < row.length - 1
                ? cell.padEnd(columnWidths[column] ?? 0)
                : cell,
        )
        console.log(cells.join("  "))
    }
}

async function loadExistingPosition(rawId: string): Promise<Position> {
    const id = parseId("position", rawId)
    if (!(await positionExists(projectRoot, id))) {
        throw new UserError(`No position "${id}". Run \`llmco position list\`.`)
    }
    return loadPosition(projectRoot, id)
}

async function loadExistingEmployee(rawId: string): Promise<Employee> {
    const id = parseId("employee", rawId)
    if (!(await employeeExists(projectRoot, id))) {
        throw new UserError(`No employee "${id}". Run \`llmco employee list\`.`)
    }
    return loadEmployee(projectRoot, id)
}

function positionsFilledBy(positions: Position[], employeeId: string): string {
    const ids = positions
        .filter(({ employee }) => employee === employeeId)
        .map(({ id }) => id)
    return ids.length > 0 ? ids.join(", ") : "(none)"
}

async function createEmployee(rawId: string, config: unknown): Promise<void> {
    await requireCompany()
    const id = parseId("employee", rawId)
    if (await employeeExists(projectRoot, id)) {
        throw new UserError(`Employee "${id}" already exists.`)
    }
    const result = EmployeeConfigSchema.safeParse(config)
    if (!result.success) {
        throw new UserError(z.prettifyError(result.error))
    }
    await saveEmployee(projectRoot, { id, ...result.data })
    console.log(`Created employee "${id}".`)
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
    .argument("<position-id>", idDescription("position", "backend-developer"))
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
    .description("List the positions and the employees filling them.")
    .action(async () => {
        await requireCompany()
        const positions = await listPositions(projectRoot)
        if (positions.length === 0) {
            console.log("No positions yet. Run `llmco position create`.")
            return
        }
        printColumns(
            positions.map(({ id, title, employee }) => [
                id,
                title,
                employee ?? "(vacant)",
            ]),
        )
    })

positionCommand
    .command("show")
    .description("Display a position: title, employee and description.")
    .argument("<position-id>", idDescription("position", "backend-developer"))
    .action(async (rawId) => {
        await requireCompany()
        const position = await loadExistingPosition(rawId)
        console.log(
            `# ${position.title}\n\nemployee: ${position.employee ?? "(vacant)"}\n\n${position.description}`,
        )
    })

positionCommand
    .command("assign")
    .description("Fill a position with an employee.")
    .argument("<position-id>", "position id")
    .argument("<employee-id>", "employee id")
    .option(
        "-r, --replace",
        "replace the employee already filling the position",
    )
    .action(async (rawPositionId, rawEmployeeId, { replace }) => {
        await requireCompany()
        const [position, employee] = await Promise.all([
            loadExistingPosition(rawPositionId),
            loadExistingEmployee(rawEmployeeId),
        ])
        const previous = position.employee
        if (previous === employee.id) {
            console.log(
                `"${employee.id}" already fills position "${position.id}".`,
            )
            return
        }
        if (previous !== undefined && !replace) {
            throw new UserError(
                `Position "${position.id}" is already filled by "${previous}". Add --replace to replace that employee.`,
            )
        }
        await savePosition(projectRoot, { ...position, employee: employee.id })
        console.log(
            previous === undefined
                ? `Assigned "${employee.id}" to position "${position.id}".`
                : `Replaced "${previous}" with "${employee.id}" on position "${position.id}".`,
        )
    })

positionCommand
    .command("unassign")
    .description("Make a position vacant.")
    .argument("<position-id>", "position id")
    .action(async (rawId) => {
        await requireCompany()
        const { employee, ...position } = await loadExistingPosition(rawId)
        if (employee === undefined) {
            console.log(`Position "${position.id}" is already vacant.`)
            return
        }
        await savePosition(projectRoot, position)
        console.log(
            `Position "${position.id}" is now vacant: "${employee}" no longer fills it.`,
        )
    })

const employeeCommand = program
    .command("employee")
    .description("Manage the employees of the company.")

const createEmployeeCommand = employeeCommand
    .command("create")
    .alias("hire")
    .description("Create (hire) an employee: an LLM or a human.")

createEmployeeCommand
    .command("llm")
    .description("Create an employee run by an LLM.")
    .argument("<employee-id>", idDescription("employee", "claude-senior"))
    .requiredOption("-n, --name <name>", "employee name")
    .requiredOption(
        "-p, --provider <provider-id>",
        "LLM provider id in kebab-case, e.g. anthropic",
    )
    .requiredOption(
        "-m, --model <model-id>",
        "model id in llmco, in kebab-case, e.g. claude-opus-5-5 (not necessarily the model name the provider expects)",
    )
    .action(async (rawId, { name, provider, model }) => {
        await createEmployee(rawId, { name, kind: "llm", provider, model })
    })

createEmployeeCommand
    .command("human")
    .description("Create an employee who is a human.")
    .argument("<employee-id>", idDescription("employee", "omar"))
    .requiredOption("-n, --name <name>", "employee name")
    .action(async (rawId, { name }) => {
        await createEmployee(rawId, { name, kind: "human" })
    })

employeeCommand
    .command("list")
    .description("List the employees and the positions they fill.")
    .action(async () => {
        await requireCompany()
        const [employees, positions] = await Promise.all([
            listEmployees(projectRoot),
            listPositions(projectRoot),
        ])
        if (employees.length === 0) {
            console.log("No employees yet. Run `llmco employee create`.")
            return
        }
        printColumns(
            employees.map((employee) => [
                employee.id,
                employee.name,
                employee.kind === "llm"
                    ? `${employee.provider}/${employee.model}`
                    : "human",
                positionsFilledBy(positions, employee.id),
            ]),
        )
    })

employeeCommand
    .command("show")
    .description("Display an employee.")
    .argument("<employee-id>", idDescription("employee", "claude-senior"))
    .action(async (rawId) => {
        await requireCompany()
        const [employee, positions] = await Promise.all([
            loadExistingEmployee(rawId),
            listPositions(projectRoot),
        ])
        const lines = [`# ${employee.name}`, "", `kind: ${employee.kind}`]
        if (employee.kind === "llm") {
            lines.push(
                `provider: ${employee.provider}`,
                `model: ${employee.model}`,
            )
        }
        lines.push(`positions: ${positionsFilledBy(positions, employee.id)}`)
        console.log(lines.join("\n"))
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
