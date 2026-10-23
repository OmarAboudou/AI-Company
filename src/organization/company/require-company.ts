import { UserError } from "../../user-error.ts"
import { hasCompany } from "./storage.ts"

export async function requireCompany(projectRoot: string): Promise<void> {
    if (!(await hasCompany(projectRoot))) {
        throw new UserError(
            "No company in this directory. Run `aico init` first.",
        )
    }
}
