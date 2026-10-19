import { cp, rm } from "node:fs/promises"
import { join } from "node:path"
import { getLlmcoFolderPath } from "../files/get-llmco-folder-path.ts"
import { listSubdirectories } from "../files/list-subdirectories.ts"
import { readJsonFile } from "../files/read-json-file.ts"
import { loadIdHistory, saveIdHistory } from "../id-history.ts"
import { type Employee, EmployeeConfigSchema } from "./employee.ts"

function employeesDir(projectRoot: string): string {
    return join(getLlmcoFolderPath(projectRoot), "employees")
}

function employeeDir(projectRoot: string, id: string): string {
    return join(employeesDir(projectRoot), id)
}

function employeeConfigPath(projectRoot: string, id: string): string {
    return join(employeeDir(projectRoot, id), "config.json")
}

function employeeHistoryPath(projectRoot: string, id: string): string {
    return join(employeeDir(projectRoot, id), "history.json")
}

export async function employeeExists(
    projectRoot: string,
    id: string,
): Promise<boolean> {
    return Bun.file(employeeConfigPath(projectRoot, id)).exists()
}

export async function loadEmployee(
    projectRoot: string,
    id: string,
): Promise<Employee> {
    const [config, history] = await Promise.all([
        readJsonFile(
            projectRoot,
            employeeConfigPath(projectRoot, id),
            EmployeeConfigSchema,
        ),
        loadIdHistory(projectRoot, employeeHistoryPath(projectRoot, id)),
    ])
    return { id, ...config, ...history }
}

export async function listEmployees(projectRoot: string): Promise<Employee[]> {
    const ids = await listSubdirectories(employeesDir(projectRoot))
    return Promise.all(ids.map((id) => loadEmployee(projectRoot, id)))
}

export async function saveEmployee(
    projectRoot: string,
    employee: Employee,
): Promise<void> {
    const { id, createdAt, formerIds, ...config } = employee
    await Promise.all([
        Bun.write(
            employeeConfigPath(projectRoot, id),
            `${JSON.stringify(config, null, 4)}\n`,
        ),
        saveIdHistory(employeeHistoryPath(projectRoot, id), {
            createdAt,
            formerIds,
        }),
    ])
}

export async function deleteEmployee(
    projectRoot: string,
    id: string,
): Promise<void> {
    await rm(employeeDir(projectRoot, id), { recursive: true })
}

export async function copyEmployee(
    projectRoot: string,
    id: string,
    newId: string,
): Promise<void> {
    await cp(employeeDir(projectRoot, id), employeeDir(projectRoot, newId), {
        recursive: true,
        errorOnExist: true,
        force: false,
    })
}
