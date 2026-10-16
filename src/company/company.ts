import { z } from "zod"

// Content of `.llmco/company/config.json`.
// `strictObject` rejects unknown keys: a typo such as `nmae`
// is reported instead of being silently ignored.
export const CompanyConfigSchema = z.strictObject({
    name: z.string().trim().min(1),
})

export type CompanyConfig = z.infer<typeof CompanyConfigSchema>

// A full company: its config, plus the content of `.llmco/company/description.md`.
export type Company = CompanyConfig & {
    description: string
}
