import type { Command } from "@commander-js/extra-typings"
import { z } from "zod"
import {
    idDescription,
    loadExistingEmployee,
    loadExistingLlmModel,
    parseId,
    printColumns,
    projectRoot,
    requireCompany,
} from "../cli-helpers.ts"
import { UserError } from "../errors.ts"
import type { Position } from "../position/position.ts"
import { listPositions } from "../position/storage.ts"
import { type EmployeeConfig, EmployeeConfigSchema } from "./employee.ts"
import { employeeExists, listEmployees, saveEmployee } from "./storage.ts"

function positionsFilledBy(positions: Position[], employeeId: string): string {
    const ids = positions
        .filter(({ defaultEmployee }) => defaultEmployee === employeeId)
        .map(({ id }) => id)
    return ids.length > 0 ? ids.join(", ") : "(none)"
}

async function requireLlmModel(config: EmployeeConfig): Promise<void> {
    if (config.kind === "llm") {
        await loadExistingLlmModel(config.provider, config.model)
    }
}

async function createEmployee(rawId: string, config: unknown): Promise<void> {
    await requireCompany()
    const id = parseId("employee", rawId)
    const result = EmployeeConfigSchema.safeParse(config)
    if (!result.success) {
        throw new UserError(z.prettifyError(result.error))
    }
    const [exists] = await Promise.all([
        employeeExists(projectRoot, id),
        requireLlmModel(result.data),
    ])
    if (exists) {
        throw new UserError(`Employee "${id}" already exists.`)
    }
    await saveEmployee(projectRoot, { id, ...result.data })
    console.log(`Created employee "${id}".`)
}

export function registerEmployeeCommands(program: Command): void {
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
        .description("List the employees.")
        .option(
            "-p, --positions",
            "also list the positions each employee fills",
        )
        .action(async ({ positions: withPositions }) => {
            await requireCompany()
            const [employees, positions] = await Promise.all([
                listEmployees(projectRoot),
                withPositions ? listPositions(projectRoot) : [],
            ])
            if (employees.length === 0) {
                console.log("No employees yet. Run `llmco employee create`.")
                return
            }
            printColumns(
                employees.map((employee) => {
                    const row = [
                        employee.id,
                        employee.name,
                        employee.kind === "llm"
                            ? `${employee.provider}/${employee.model}`
                            : "human",
                    ]
                    return withPositions
                        ? [...row, positionsFilledBy(positions, employee.id)]
                        : row
                }),
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
            lines.push(
                `positions: ${positionsFilledBy(positions, employee.id)}`,
            )
            console.log(lines.join("\n"))
        })
}
