import { z } from "zod"

export const CompanyConfigSchema = z
    .strictObject({
        name: z
            .string()
            .trim()
            .min(1)
            .meta({ description: "Name of the company, e.g. Acme." }),
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
