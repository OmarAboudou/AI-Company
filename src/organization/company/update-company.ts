import { parseConfig } from "../../parse-config.ts"
import { requireCompany } from "./require-company.ts"
import { type Company, CompanyConfigSchema } from "./schema.ts"
import { loadCompany, saveCompany } from "./storage.ts"

export async function updateCompany(
    projectRoot: string,
    changes: { name?: string },
): Promise<Company> {
    await requireCompany(projectRoot)
    const company = await loadCompany(projectRoot)
    const updatedCompany = parseConfig(CompanyConfigSchema, {
        ...company,
        name: changes.name ?? company.name,
    })
    await saveCompany(projectRoot, updatedCompany)
    return updatedCompany
}
