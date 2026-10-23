import { mkdir, mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createGitRepository } from "../../git/create-git-repository.testing.ts"
import { runGit } from "../../git/run-git.ts"
import { createCompany } from "./create-company.ts"

export type ClonedCompany = {
    parentFolderPath: string
    projectRoot: string
    clonePath: string
}

export async function createClonedCompany(): Promise<ClonedCompany> {
    const parentFolderPath = await mkdtemp(join(tmpdir(), "aico-"))
    const projectRoot = join(parentFolderPath, "acme")
    const clonePath = join(parentFolderPath, "clone")
    await mkdir(projectRoot)
    createGitRepository(projectRoot, {
        name: "Test User",
        email: "test@example.com",
    })
    await createCompany(projectRoot, { name: "Acme", description: "" })
    const aicoFolderPath = join(projectRoot, ".aico")
    runGit(aicoFolderPath, ["add", "--all"])
    runGit(aicoFolderPath, ["commit", "-q", "-m", "aico init"])
    runGit(parentFolderPath, ["clone", "-q", projectRoot, clonePath])
    return { parentFolderPath, projectRoot, clonePath }
}
