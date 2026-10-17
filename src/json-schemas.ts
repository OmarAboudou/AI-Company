import { z } from "zod"
import { CompanyConfigSchema } from "./company/company.ts"
import { EmployeeConfigSchema } from "./employee/employee.ts"
import { PositionConfigSchema } from "./position/position.ts"

const publishedAt =
    "https://raw.githubusercontent.com/OmarAboudou/LLM-Company/main/schemas"

const configSchemas = {
    company: CompanyConfigSchema,
    position: PositionConfigSchema,
    employee: EmployeeConfigSchema,
}

export const jsonSchemas = Object.fromEntries(
    Object.entries(configSchemas).map(([name, schema]) => {
        const { $schema, ...jsonSchema } = z.toJSONSchema(schema)
        return [
            name,
            { $schema, $id: `${publishedAt}/${name}.json`, ...jsonSchema },
        ]
    }),
)
