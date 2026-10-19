import { cp, rm } from "node:fs/promises"
import { join } from "node:path"
import { getLlmcoFolderPath } from "../../files/get-llmco-folder-path.ts"
import { listSubdirectories } from "../../files/list-subdirectories.ts"
import { readJsonFile } from "../../files/read-json-file.ts"
import { loadIdHistory, saveIdHistory } from "../../ids/id-history-storage.ts"
import { type Employee, EmployeeConfigSchema } from "./schema.ts"

function getEmployeesFolderPath(projectRoot: string): string {
    return join(getLlmcoFolderPath(projectRoot), "employees")
}

function getEmployeeFolderPath(projectRoot: string, id: string): string {
    return join(getEmployeesFolderPath(projectRoot), id)
}

function getEmployeeConfigFilePath(projectRoot: string, id: string): string {
    return join(getEmployeeFolderPath(projectRoot, id), "config.json")
}

function getEmployeeHistoryFilePath(projectRoot: string, id: string): string {
    return join(getEmployeeFolderPath(projectRoot, id), "history.json")
}

export async function hasEmployee(
    projectRoot: string,
    id: string,
): Promise<boolean> {
    return Bun.file(getEmployeeConfigFilePath(projectRoot, id)).exists()
}

export async function loadEmployee(
    projectRoot: string,
    id: string,
): Promise<Employee> {
    const [config, history] = await Promise.all([
        readJsonFile(
            projectRoot,
            getEmployeeConfigFilePath(projectRoot, id),
            EmployeeConfigSchema,
        ),
        loadIdHistory(projectRoot, getEmployeeHistoryFilePath(projectRoot, id)),
    ])
    return { id, ...config, ...history }
}

export async function listEmployees(projectRoot: string): Promise<Employee[]> {
    const employeeIds = await listSubdirectories(
        getEmployeesFolderPath(projectRoot),
    )
    return Promise.all(employeeIds.map((id) => loadEmployee(projectRoot, id)))
}

export async function saveEmployee(
    projectRoot: string,
    employee: Employee,
): Promise<void> {
    const { id, createdAt, formerIds, ...config } = employee
    await Promise.all([
        Bun.write(
            getEmployeeConfigFilePath(projectRoot, id),
            `${JSON.stringify(config, null, 4)}\n`,
        ),
        saveIdHistory(getEmployeeHistoryFilePath(projectRoot, id), {
            createdAt,
            formerIds,
        }),
    ])
}

export async function deleteEmployeeFolder(
    projectRoot: string,
    id: string,
): Promise<void> {
    await rm(getEmployeeFolderPath(projectRoot, id), { recursive: true })
}

export async function copyEmployeeFolder(
    projectRoot: string,
    id: string,
    newId: string,
): Promise<void> {
    await cp(
        getEmployeeFolderPath(projectRoot, id),
        getEmployeeFolderPath(projectRoot, newId),
        {
            recursive: true,
            errorOnExist: true,
            force: false,
        },
    )
}
