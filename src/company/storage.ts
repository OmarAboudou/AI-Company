import { join } from "node:path"
import { type Company, CompanyConfigSchema } from "./company.ts"

function companyPaths(projectRoot: string) {
    const dir = join(projectRoot, ".llmco", "company")
    return {
        config: join(dir, "config.json"),
        description: join(dir, "description.md"),
    }
}

export async function loadCompany(projectRoot: string): Promise<Company> {
    const paths = companyPaths(projectRoot)
    const config = CompanyConfigSchema.parse(
        await Bun.file(paths.config).json(),
    )
    const description = await Bun.file(paths.description).text()
    return { ...config, description }
}
