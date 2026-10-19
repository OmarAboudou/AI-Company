import { UserError } from "../../user-error.ts"
import { companyExists } from "./storage.ts"

export async function requireCompany(projectRoot: string): Promise<void> {
    if (!(await companyExists(projectRoot))) {
        throw new UserError(
            "No company in this directory. Run `llmco init` first.",
        )
    }
}
