import { z } from "zod"
import { IdSchema } from "../id.ts"

const NameSchema = z
    .string()
    .trim()
    .min(1)
    .meta({ description: "Display name of the employee, e.g. Claude Senior." })

export const EmployeeConfigSchema = z
    .discriminatedUnion("kind", [
        z
            .strictObject({
                name: NameSchema,
                kind: z.literal("llm").meta({
                    description:
                        "llm: run by an LLM, which needs a provider and a model.",
                }),
                provider: IdSchema.meta({
                    description: "Id of the LLM provider, e.g. anthropic.",
                }),
                model: IdSchema.meta({
                    description:
                        "Id of the model in llmco, e.g. claude-opus-5-5. Not necessarily the model name the provider expects.",
                }),
            })
            .meta({ description: "An employee run by an LLM." }),
        z
            .strictObject({
                name: NameSchema,
                kind: z.literal("human").meta({
                    description:
                        "human: a person, e.g. taking over a position.",
                }),
            })
            .meta({ description: "An employee who is a human." }),
    ])
    .meta({
        title: "llmco employee",
        description:
            "Configuration of an employee, in .llmco/employees/<employee-id>/config.json.",
    })

export type EmployeeConfig = z.infer<typeof EmployeeConfigSchema>

export type Employee = EmployeeConfig & {
    id: string
}
