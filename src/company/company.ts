import { z } from "zod"

// Contenu de `.llmco/company/config.json`.
// `strictObject` refuse les clés inconnues : une faute de frappe comme `nmae`
// est signalée au lieu d'être ignorée en silence.
export const CompanyConfigSchema = z.strictObject({
    name: z.string().trim().min(1),
})

export type CompanyConfig = z.infer<typeof CompanyConfigSchema>

// Une company complète : sa config, plus le contenu de `.llmco/company/description.md`.
export type Company = CompanyConfig & {
    description: string
}
