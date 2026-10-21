import { parseConfig } from "../../parse-config.ts"
import { requireCompany } from "./require-company.ts"
import { type Company, CompanyConfigSchema } from "./schema.ts"
import { loadCompany, saveCompany } from "./storage.ts"

export async function updateCompany(
    projectRoot: string,
    changes: { name?: string; description?: string },
): Promise<Company> {
    await requireCompany(projectRoot)
    const { description, ...config } = await loadCompany(projectRoot)
    const updatedConfig = parseConfig(CompanyConfigSchema, {
        ...config,
        name: changes.name ?? config.name,
    })
    const updatedCompany = {
        ...updatedConfig,
        description: changes.description ?? description,
    }
    await saveCompany(projectRoot, updatedCompany)
    return updatedCompany
}
