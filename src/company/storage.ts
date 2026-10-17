import { join } from "node:path"
import { readConfig, readText } from "../files.ts"
import { llmcoDir } from "../project.ts"
import { type Company, CompanyConfigSchema } from "./company.ts"

function companyPaths(projectRoot: string) {
    const dir = join(llmcoDir(projectRoot), "company")
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
        readConfig(projectRoot, paths.config, CompanyConfigSchema),
        readText(projectRoot, paths.description),
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
