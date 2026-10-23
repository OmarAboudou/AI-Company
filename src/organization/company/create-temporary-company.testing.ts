import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createGitRepository } from "../../git/create-git-repository.testing.ts"
import { createReservedBranch } from "../../git/reserved-branch/create-reserved-branch.ts"
import { runOperation } from "../../git/reserved-branch/run-operation.ts"
import { savePosition } from "../position/storage.ts"
import { saveProject } from "../project/storage.ts"
import { saveCompany } from "./storage.ts"

export async function createTemporaryCompany(): Promise<string> {
    const projectRoot = await mkdtemp(join(tmpdir(), "aico-"))
    createGitRepository(projectRoot, {
        name: "Test User",
        email: "test@example.com",
    })
    await createReservedBranch(projectRoot)
    const founderPositionId = "founder"
    await runOperation(projectRoot, "aico init", async () => {
        await Promise.all([
            saveCompany(projectRoot, { name: "Acme", founderPositionId }),
            saveProject(projectRoot, { description: "" }),
            savePosition(projectRoot, {
                id: founderPositionId,
                title: "Founder",
                description: "",
            }),
        ])
    })
    return projectRoot
}
