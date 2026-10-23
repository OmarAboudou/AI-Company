import { z } from "zod"
import { IdSchema } from "../../ids/id-schema.ts"
import { defineEventType } from "../../journal/schema.ts"

export const CompanyConfigSchema = z
    .strictObject({
        name: z
            .string()
            .trim()
            .min(1)
            .meta({ description: "Name of the company, e.g. Acme." }),
        directorPositionId: IdSchema.meta({
            description:
                "Id of the director's position, i.e. the name of its folder in .aico/positions: the company's management, which the user, the person git names, always holds. It can't be deleted.",
        }),
    })
    .meta({
        title: "AICo company",
        description:
            "Configuration of the company, in .aico/company/config.json.",
    })

export type Company = z.infer<typeof CompanyConfigSchema>

export const companyCreatedEventType = defineEventType({
    type: "company-created",
    description:
        "aico init created the company, with its director's position, whose first task follows.",
    fields: {},
})
