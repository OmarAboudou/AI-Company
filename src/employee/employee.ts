import { z } from "zod"
import { IdSchema } from "../id.ts"

const NameSchema = z.string().trim().min(1)

export const EmployeeConfigSchema = z.discriminatedUnion("kind", [
    z.strictObject({
        name: NameSchema,
        kind: z.literal("llm"),
        provider: IdSchema,
        model: IdSchema,
    }),
    z.strictObject({
        name: NameSchema,
        kind: z.literal("human"),
    }),
])

export type EmployeeConfig = z.infer<typeof EmployeeConfigSchema>

export type Employee = EmployeeConfig & {
    id: string
}
