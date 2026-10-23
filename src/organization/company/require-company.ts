import { openReservedBranch } from "../../git/reserved-branch/open-reserved-branch.ts"
import { UserError } from "../../user-error.ts"
import { hasCompany } from "./storage.ts"

export async function requireCompany(projectRoot: string): Promise<void> {
    await openReservedBranch(projectRoot)
    if (!(await hasCompany(projectRoot))) {
        throw new UserError(
            "No company in this directory. Run `aico init` first.",
        )
    }
}
