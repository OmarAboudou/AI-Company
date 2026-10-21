import { join } from "node:path"
import { getLlmcoFolderPath } from "../../files/get-llmco-folder-path.ts"
import { readJsonFile } from "../../files/read-json-file.ts"
import { readTextFile } from "../../files/read-text-file.ts"
import { saveJsonFile } from "../../files/save-json-file.ts"
import { type Company, CompanyConfigSchema } from "./schema.ts"

function getCompanyFilePaths(projectRoot: string) {
    const companyFolderPath = join(getLlmcoFolderPath(projectRoot), "company")
    return {
        config: join(companyFolderPath, "config.json"),
        description: join(companyFolderPath, "description.md"),
    }
}

export async function hasCompany(projectRoot: string): Promise<boolean> {
    return Bun.file(getCompanyFilePaths(projectRoot).config).exists()
}

export async function loadCompany(projectRoot: string): Promise<Company> {
    const paths = getCompanyFilePaths(projectRoot)
    const [config, description] = await Promise.all([
        readJsonFile(projectRoot, paths.config, CompanyConfigSchema),
        readTextFile(projectRoot, paths.description),
    ])
    return { ...config, description }
}

export async function saveCompany(
    projectRoot: string,
    company: Company,
): Promise<void> {
    const paths = getCompanyFilePaths(projectRoot)
    const { description, ...config } = company
    await Promise.all([
        saveJsonFile(paths.config, config),
        Bun.write(paths.description, description),
    ])
}
