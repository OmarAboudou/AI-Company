import { z } from "zod"
import { IdSchema } from "../id.ts"
import type { IdHistoryRecord } from "../id-history.ts"

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
                providerId: IdSchema.meta({
                    description:
                        "Id of the LLM provider, i.e. the name of its folder in .llmco/llm-providers, e.g. anthropic.",
                }),
                modelId: IdSchema.meta({
                    description:
                        "Id of one of the provider's models in llmco, i.e. the name of its folder in .llmco/llm-providers/<provider-id>/models, e.g. claude-opus-5-5. Not its apiId, the id the provider's API expects.",
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

export type Employee = EmployeeConfig &
    IdHistoryRecord & {
        id: string
    }
