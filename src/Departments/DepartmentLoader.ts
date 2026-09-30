import type ApplicationConfig from "../ApplicationConfig";
import type { DepartmentDefinition } from "./Department";

const DEPARTMENT_DIRECTORY = "Departments"

export async function loadDepartments(
    appConfig: ApplicationConfig
): Promise<DepartmentDefinition[]> 
{
    throw new Error("Not implemented")
}