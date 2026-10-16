import { join } from "node:path"
import { type Company, CompanyConfigSchema } from "./company.ts"

function companyPaths(projectRoot: string) {
    const dir = join(projectRoot, ".llmco", "company")
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
    const [rawConfig, description] = await Promise.all([
        Bun.file(paths.config).json(),
        Bun.file(paths.description).text(),
    ])
    return { ...CompanyConfigSchema.parse(rawConfig), description }
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
