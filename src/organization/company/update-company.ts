import { z } from "zod"
import { UserError } from "../../user-error.ts"
import { requireCompany } from "./require-company.ts"
import { type Company, CompanyConfigSchema } from "./schema.ts"
import { loadCompany, saveCompany } from "./storage.ts"

export async function updateCompany(
    projectRoot: string,
    changes: { name?: string; description?: string },
): Promise<Company> {
    await requireCompany(projectRoot)
    const { description, ...config } = await loadCompany(projectRoot)
    const validation = CompanyConfigSchema.safeParse({
        ...config,
        name: changes.name ?? config.name,
    })
    if (!validation.success) {
        throw new UserError(z.prettifyError(validation.error))
    }
    const updatedCompany = {
        ...validation.data,
        description: changes.description ?? description,
    }
    await saveCompany(projectRoot, updatedCompany)
    return updatedCompany
}
