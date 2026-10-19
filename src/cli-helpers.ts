import { Option } from "@commander-js/extra-typings"
import { z } from "zod"
import { companyExists } from "./company/storage.ts"
import type { Employee } from "./employee/employee.ts"
import { employeeExists, loadEmployee } from "./employee/storage.ts"
import { readTextFile } from "./files/read-text-file.ts"
import { IdSchema } from "./id.ts"
import type { LlmModel } from "./llm-model/llm-model.ts"
import { llmModelExists, loadLlmModel } from "./llm-model/storage.ts"
import type { LlmProvider } from "./llm-provider/llm-provider.ts"
import { llmProviderExists, loadLlmProvider } from "./llm-provider/storage.ts"
import type { Position } from "./position/position.ts"
import { loadPosition, positionExists } from "./position/storage.ts"
import { loadThread, threadExists } from "./thread/storage.ts"
import type { Thread } from "./thread/thread.ts"
import { UserError } from "./user-error.ts"

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

export async function readTextOrFile<Text extends string | undefined>(
    text: Text,
    file: string | undefined,
): Promise<Text | string> {
    if (file === undefined) {
        return text
    }
    if (file === "-") {
        return Bun.stdin.text()
    }
    return readTextFile(projectRoot, file)
}

export function requireAnOption(options: object): void {
    if (Object.values(options).every((value) => value === undefined)) {
        throw new UserError(
            "Nothing to update: give at least one option (see --help).",
        )
    }
}

export function withoutUndefined<Values extends object>(
    values: Values,
): Partial<Values> {
    return Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== undefined),
    ) as Partial<Values>
}

const entityFolders = {
    thread: ".llmco/threads",
    position: ".llmco/positions",
    employee: ".llmco/employees",
    provider: ".llmco/llm-providers",
    model: ".llmco/llm-providers/<provider-id>/models",
}

export function idDescription(
    entity: keyof typeof entityFolders,
    example: string,
): string {
    return `${entity} id, which is also the name of its folder in ${entityFolders[entity]} (kebab-case, e.g. ${example})`
}

export function newIdDescription(
    entity: keyof typeof entityFolders,
    example: string,
): string {
    return `new ${entity} id, which becomes the name of its folder in ${entityFolders[entity]} (kebab-case, e.g. ${example})`
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
        console.log(cells.join("  ").trimEnd())
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

export async function loadExistingLlmProvider(
    rawId: string,
): Promise<LlmProvider> {
    const id = parseId("provider", rawId)
    if (!(await llmProviderExists(projectRoot, id))) {
        throw new UserError(`No provider "${id}". Run \`llmco provider list\`.`)
    }
    return loadLlmProvider(projectRoot, id)
}

export async function loadExistingLlmModel(
    rawProviderId: string,
    rawModelId: string,
): Promise<LlmModel> {
    const provider = await loadExistingLlmProvider(rawProviderId)
    const modelId = parseId("model", rawModelId)
    if (!(await llmModelExists(projectRoot, provider.id, modelId))) {
        throw new UserError(
            `Provider "${provider.id}" has no model "${modelId}". Run \`llmco model list\`.`,
        )
    }
    return loadLlmModel(projectRoot, provider.id, modelId)
}

export async function loadExistingThread(rawId: string): Promise<Thread> {
    const id = parseId("thread", rawId)
    if (!(await threadExists(projectRoot, id))) {
        throw new UserError(`No thread "${id}". Run \`llmco thread list\`.`)
    }
    return loadThread(projectRoot, id)
}
