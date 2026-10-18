import { z } from "zod"
import { IdSchema } from "../id.ts"

export const CompanyConfigSchema = z
    .strictObject({
        name: z
            .string()
            .trim()
            .min(1)
            .meta({ description: "Name of the company, e.g. Acme." }),
        directorPositionId: IdSchema.meta({
            description:
                "Id of the director's position, i.e. the name of its folder in .llmco/positions: the company's management, from which the human at the keyboard acts by default. It can't be deleted.",
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
