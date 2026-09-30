import z from "zod"

export interface DepartmentDefinition
{
    name: string,
    description: string,
    tools: string[]
}

const DepartmentDefinitionSchema: z.ZodType<DepartmentDefinition> = z.object({
    name: z.string().describe("The name of the department."),
    description: z.string().describe("A description of what the department do."),
    tools: z.array(z.string().describe("The name of the tool.")).describe("The tools available for this department.")
})

export function defineDepartment(
    definition: DepartmentDefinition,
): DepartmentDefinition {
    return definition
}

export function isDepartmentDefinition(value: unknown): value is DepartmentDefinition{
    return DepartmentDefinitionSchema.safeParse(value).success
}