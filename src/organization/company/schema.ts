import { z } from "zod"
import { IdSchema } from "../../ids/id-schema.ts"

export const defaultMaxTaskDepth = 200

export const CompanyConfigSchema = z
    .strictObject({
        name: z
            .string()
            .trim()
            .min(1)
            .meta({ description: "Name of the company, e.g. Acme." }),
        directorPositionId: IdSchema.meta({
            description:
                "Id of the director's position, i.e. the name of its folder in .llmco/positions: the company's management, held by no employee: the people working on the repository, identified by git, write from it. It can't be deleted.",
        }),
        maxTaskDepth: z
            .int()
            .min(1)
            .optional()
            .meta({
                description: `How deep a chain of tasks may grow, each created from an event of the one before, such as LLM employees mentioning each other: beyond it, llmco creates no task and records chain-stopped in the journal. A person's message starts again from 0. ${defaultMaxTaskDepth} when absent.`,
            }),
    })
    .meta({
        title: "llmco company",
        description:
            "Configuration of the company, in .llmco/company/config.json. Its description lives next to it, in description.md.",
    })

export type CompanyConfig = z.infer<typeof CompanyConfigSchema>

export type Company = CompanyConfig & {
    description: string
}
