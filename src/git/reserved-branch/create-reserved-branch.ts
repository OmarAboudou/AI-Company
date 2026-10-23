import { getAicoFolderPath } from "../../files/get-aico-folder-path.ts"
import { listFolderEntries } from "../../files/list-folder-entries.ts"
import { UserError } from "../../user-error.ts"
import { runGitOrThrow } from "../run-git-or-throw.ts"
import { excludeAicoFolder } from "./exclude-aico-folder.ts"
import { reservedBranchName } from "./reserved-branch.ts"

export async function createReservedBranch(projectRoot: string): Promise<void> {
    const aicoFolderEntries = await listFolderEntries(
        getAicoFolderPath(projectRoot),
    )
    if (aicoFolderEntries.length > 0) {
        throw new UserError(
            `.aico/ already exists, and isn't the worktree of branch ${reservedBranchName}: move it away, then run \`aico init\` again.`,
        )
    }
    const checkoutArgs = ["--orphan", "-b", reservedBranchName, ".aico"]
    runGitOrThrow(projectRoot, ["worktree", "add", "-q", ...checkoutArgs])
    await excludeAicoFolder(projectRoot)
}
