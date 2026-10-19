import { z } from "zod"
import { requireGitRepository } from "../../git/require-git-repository.ts"
import { UserError } from "../../user-error.ts"
import { savePosition } from "../position/storage.ts"
import { type Company, CompanyConfigSchema } from "./schema.ts"
import { hasCompany, saveCompany } from "./storage.ts"

const directorPositionId = "director"

export async function createCompany(
    projectRoot: string,
    { name, description }: { name: string; description: string },
): Promise<Company> {
    requireGitRepository(projectRoot)
    if (await hasCompany(projectRoot)) {
        throw new UserError("A company already exists in this directory.")
    }
    const validation = CompanyConfigSchema.safeParse({
        name,
        directorPositionId,
    })
    if (!validation.success) {
        throw new UserError(z.prettifyError(validation.error))
    }
    await savePosition(projectRoot, {
        id: directorPositionId,
        title: "Director",
        createdAt: new Date().toISOString(),
        description: "",
    })
    // The company comes last: until its config.json exists, llmco
    // sees no company, so an interrupted init can be run again.
    const company = { ...validation.data, description }
    await saveCompany(projectRoot, company)
    return company
}
