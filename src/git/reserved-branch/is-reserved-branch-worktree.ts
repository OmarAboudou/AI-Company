import { join } from "node:path"
import { getAicoFolderPath } from "../../files/get-aico-folder-path.ts"
import { runGit } from "../run-git.ts"
import { reservedBranchName } from "./reserved-branch.ts"

export async function isReservedBranchWorktree(
    projectRoot: string,
): Promise<boolean> {
    const aicoFolderPath = getAicoFolderPath(projectRoot)
    if (!(await Bun.file(join(aicoFolderPath, ".git")).exists())) {
        return false
    }
    const pathInWorktree = runGit(aicoFolderPath, [
        "rev-parse",
        "--show-prefix",
    ])
    const branchRef = runGit(aicoFolderPath, [
        "symbolic-ref",
        "--quiet",
        "HEAD",
    ])
    return (
        pathInWorktree === "" &&
        branchRef === `refs/heads/${reservedBranchName}`
    )
}
