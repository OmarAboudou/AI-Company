import { join } from "node:path"
import { getLlmcoFolderPath } from "../../files/get-llmco-folder-path.ts"
import { readJsonFile } from "../../files/read-json-file.ts"
import { readTextFile } from "../../files/read-text-file.ts"
import { type Company, CompanyConfigSchema } from "./schema.ts"

function companyPaths(projectRoot: string) {
    const dir = join(getLlmcoFolderPath(projectRoot), "company")
    return {
        config: join(dir, "config.json"),
        description: join(dir, "description.md"),
    }
}

export async function companyExists(projectRoot: string): Promise<boolean> {
    return Bun.file(companyPaths(projectRoot).config).exists()
}

export async function loadCompany(projectRoot: string): Promise<Company> {
    const paths = companyPaths(projectRoot)
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
    const paths = companyPaths(projectRoot)
    const { description, ...config } = company
    await Promise.all([
        Bun.write(paths.config, `${JSON.stringify(config, null, 4)}\n`),
        Bun.write(paths.description, description),
    ])
}
