import { requireGitRepository } from "../../git/require-git-repository.ts"
import { createReservedBranch } from "../../git/reserved-branch/create-reserved-branch.ts"
import { isReservedBranchWorktree } from "../../git/reserved-branch/is-reserved-branch-worktree.ts"
import { openReservedBranch } from "../../git/reserved-branch/open-reserved-branch.ts"
import { runOperation } from "../../git/reserved-branch/run-operation.ts"
import { recordEvent } from "../../journal/record-event.ts"
import { loadJournal } from "../../journal/storage.ts"
import { parseConfig } from "../../parse-config.ts"
import { UserError } from "../../user-error.ts"
import { savePosition } from "../position/storage.ts"
import { saveProject } from "../project/storage.ts"
import {
    type Company,
    CompanyConfigSchema,
    companyCreatedEventType,
} from "./schema.ts"
import { hasCompany, saveCompany } from "./storage.ts"

const founderPositionId = "founder"

export async function createCompany(
    projectRoot: string,
    {
        name,
        projectDescription = "",
    }: { name: string; projectDescription?: string },
): Promise<Company> {
    requireGitRepository(projectRoot)
    await openReservedBranch(projectRoot)
    if (await hasCompany(projectRoot)) {
        throw new UserError("A company already exists in this directory.")
    }
    const company = parseConfig(CompanyConfigSchema, {
        name,
        founderPositionId,
    })
    if (!(await isReservedBranchWorktree(projectRoot))) {
        await createReservedBranch(projectRoot)
    }
    // Other commands run as operations of the command line; init runs its
    // own once the branch exists, whose worktree keeps the operations' lock.
    return runOperation(projectRoot, "aico init", async () => {
        await Promise.all([
            savePosition(projectRoot, {
                id: founderPositionId,
                title: "Founder",
                createdAt: new Date().toISOString(),
                description: "",
            }),
            saveProject(projectRoot, { description: projectDescription }),
        ])
        await recordEvent(
            await loadJournal(projectRoot),
            companyCreatedEventType,
            { depth: 0 },
        )
        // The company comes last: until its config.json exists, AICo
        // sees no company, so an interrupted init can be run again.
        await saveCompany(projectRoot, company)
        return company
    })
}
