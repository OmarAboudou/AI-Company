import { join } from "node:path"
import { getAicoFolderPath } from "../../files/get-aico-folder-path.ts"
import { readJsonFile } from "../../files/read-json-file.ts"
import { saveJsonFile } from "../../files/save-json-file.ts"
import { type Company, CompanyConfigSchema } from "./schema.ts"

function getCompanyConfigPath(projectRoot: string): string {
    return join(getAicoFolderPath(projectRoot), "company", "config.json")
}

export async function hasCompany(projectRoot: string): Promise<boolean> {
    return Bun.file(getCompanyConfigPath(projectRoot)).exists()
}

export async function loadCompany(projectRoot: string): Promise<Company> {
    return readJsonFile(
        projectRoot,
        getCompanyConfigPath(projectRoot),
        CompanyConfigSchema,
    )
}

export async function saveCompany(
    projectRoot: string,
    company: Company,
): Promise<void> {
    await saveJsonFile(getCompanyConfigPath(projectRoot), company)
}
