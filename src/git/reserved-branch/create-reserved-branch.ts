import { getAicoFolderPath } from "../../files/get-aico-folder-path.ts"
import { listFolderEntries } from "../../files/list-folder-entries.ts"
import { UserError } from "../../user-error.ts"
import { spawnGit } from "../spawn-git.ts"
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
    const creation = spawnGit(projectRoot, [
        "worktree",
        "add",
        "--quiet",
        "--orphan",
        "-b",
        reservedBranchName,
        ".aico",
    ])
    if (creation.exitCode !== 0) {
        throw new Error(
            `git couldn't create branch ${reservedBranchName}: ${creation.stderr.toString()}`,
        )
    }
    await excludeAicoFolder(projectRoot)
}
