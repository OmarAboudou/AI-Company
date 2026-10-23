import { z } from "zod"
import type { IdHistoryRecord } from "../../ids/id-history-schema.ts"
import { IdSchema } from "../../ids/id-schema.ts"

const NameSchema = z
    .string()
    .trim()
    .min(1)
    .meta({ description: "Display name of the employee, e.g. Claude Senior." })

export const EmployeeConfigSchema = z
    .strictObject({
        name: NameSchema,
        kind: z.literal("llm").meta({
            description:
                "llm: run by an LLM, which needs a provider and a model.",
        }),
        providerId: IdSchema.meta({
            description:
                "Id of the LLM provider, i.e. the name of its folder in .aico/llm-providers, e.g. anthropic.",
        }),
        modelId: IdSchema.meta({
            description:
                "Id of one of the provider's models in AICo, i.e. the name of its folder in .aico/llm-providers/<provider-id>/models, e.g. claude-opus-5-5. Not its apiId, the id the provider's API expects.",
        }),
    })
    .meta({
        title: "AICo employee",
        description:
            "Configuration of an employee, run by an LLM, in .aico/employees/<employee-id>/config.json.",
    })

export type EmployeeConfig = z.infer<typeof EmployeeConfigSchema>

export type Employee = EmployeeConfig &
    IdHistoryRecord & {
        id: string
    }
