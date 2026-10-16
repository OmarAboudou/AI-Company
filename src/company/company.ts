import { z } from "zod"

export const CompanyConfigSchema = z.strictObject({
    name: z.string().trim().min(1),
})

export type CompanyConfig = z.infer<typeof CompanyConfigSchema>

export type Company = CompanyConfig & {
    description: string
}
