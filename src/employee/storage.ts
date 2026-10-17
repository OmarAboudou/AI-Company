import { join } from "node:path"
import { listSubdirectories, readConfig } from "../files.ts"
import { llmcoDir } from "../project.ts"
import { type Employee, EmployeeConfigSchema } from "./employee.ts"

function employeesDir(projectRoot: string): string {
    return join(llmcoDir(projectRoot), "employees")
}

function employeeConfigPath(projectRoot: string, id: string): string {
    return join(employeesDir(projectRoot), id, "config.json")
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
    const config = await readConfig(
        projectRoot,
        employeeConfigPath(projectRoot, id),
        EmployeeConfigSchema,
    )
    return { id, ...config }
}

export async function listEmployees(projectRoot: string): Promise<Employee[]> {
    const ids = await listSubdirectories(employeesDir(projectRoot))
    return Promise.all(ids.map((id) => loadEmployee(projectRoot, id)))
}

export async function saveEmployee(
    projectRoot: string,
    employee: Employee,
): Promise<void> {
    const { id, ...config } = employee
    await Bun.write(
        employeeConfigPath(projectRoot, id),
        `${JSON.stringify(config, null, 4)}\n`,
    )
}
