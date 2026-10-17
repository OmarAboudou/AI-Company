import { Option } from "@commander-js/extra-typings"
import { z } from "zod"
import { companyExists } from "./company/storage.ts"
import type { Employee } from "./employee/employee.ts"
import { employeeExists, loadEmployee } from "./employee/storage.ts"
import { UserError } from "./errors.ts"
import { readText } from "./files.ts"
import { IdSchema } from "./id.ts"
import type { Position } from "./position/position.ts"
import { loadPosition, positionExists } from "./position/storage.ts"

export const projectRoot = process.cwd()

export async function requireCompany(): Promise<void> {
    if (!(await companyExists(projectRoot))) {
        throw new UserError(
            "No company in this directory. Run `llmco init` first.",
        )
    }
}

export function descriptionFileOption() {
    return new Option(
        "-F, --description-file <path>",
        "read the description from a file, or from stdin with -",
    ).conflicts("description")
}

export async function readDescription(
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

const entityFolders = {
    position: ".llmco/positions",
    employee: ".llmco/employees",
}

export function idDescription(
    entity: keyof typeof entityFolders,
    example: string,
): string {
    return `${entity} id, which is also the name of its folder in ${entityFolders[entity]} (kebab-case, e.g. ${example})`
}

export function parseId(entity: string, id: string): string {
    const result = IdSchema.safeParse(id)
    if (!result.success) {
        throw new UserError(
            `Invalid ${entity} id "${id}".\n${z.prettifyError(result.error)}`,
        )
    }
    return result.data
}

export function printColumns(rows: string[][]): void {
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

export async function loadExistingPosition(rawId: string): Promise<Position> {
    const id = parseId("position", rawId)
    if (!(await positionExists(projectRoot, id))) {
        throw new UserError(`No position "${id}". Run \`llmco position list\`.`)
    }
    return loadPosition(projectRoot, id)
}

export async function loadExistingEmployee(rawId: string): Promise<Employee> {
    const id = parseId("employee", rawId)
    if (!(await employeeExists(projectRoot, id))) {
        throw new UserError(`No employee "${id}". Run \`llmco employee list\`.`)
    }
    return loadEmployee(projectRoot, id)
}
