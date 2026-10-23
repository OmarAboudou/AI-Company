import { dirname } from "node:path"
import { getAicoFolderPath } from "../../files/get-aico-folder-path.ts"
import { listFolderEntries } from "../../files/list-folder-entries.ts"
import { UserError } from "../../user-error.ts"
import { runGit } from "../run-git.ts"
import { runGitOrThrow } from "../run-git-or-throw.ts"
import { excludeAicoFolder } from "./exclude-aico-folder.ts"
import { reservedBranchName } from "./reserved-branch.ts"

const reservedBranchRef = `refs/heads/${reservedBranchName}`

type Worktree = { path: string; branchRef?: string; isPrunable: boolean }

function listWorktrees(projectRoot: string): Worktree[] {
    const listing = runGit(projectRoot, ["worktree", "list", "--porcelain"])
    return (listing ?? "")
        .split("\n\n")
        .filter((block) => block !== "")
        .map((block) => {
            const lines = block.split("\n")
            const readValue = (key: string) =>
                lines
                    .find((line) => line.startsWith(`${key} `))
                    ?.slice(key.length + 1)
            return {
                path: readValue("worktree") ?? "",
                branchRef: readValue("branch"),
                isPrunable: lines.some((line) => line.startsWith("prunable")),
            }
        })
}

// git refuses to check a branch out twice, and keeps a worktree deleted
// by hand registered until it's removed.
function freeReservedBranch(projectRoot: string): void {
    const worktree = listWorktrees(projectRoot).find(
        ({ branchRef }) => branchRef === reservedBranchRef,
    )
    if (worktree === undefined) {
        return
    }
    if (!worktree.isPrunable) {
        throw new UserError(
            `The company's branch, ${reservedBranchName}, is checked out in ${worktree.path}: run AICo from ${dirname(worktree.path)}.`,
        )
    }
    runGitOrThrow(projectRoot, ["worktree", "remove", "--force", worktree.path])
}

function readRemoteBranchNames(projectRoot: string): string[] {
    const remoteNames = (runGit(projectRoot, ["remote"]) ?? "")
        .split("\n")
        .filter((remoteName) => remoteName !== "")
    if (remoteNames.length === 0) {
        return []
    }
    const remoteBranchRefs = remoteNames.map(
        (remoteName) => `refs/remotes/${remoteName}/${reservedBranchName}`,
    )
    const listing = runGit(projectRoot, [
        "for-each-ref",
        "--format=%(refname:lstrip=2)",
        ...remoteBranchRefs,
    ])
    return (listing ?? "").split("\n").filter((name) => name !== "")
}

function readCheckoutArgs(projectRoot: string): string[] | undefined {
    const hasLocalBranch =
        runGit(projectRoot, [
            "rev-parse",
            "--quiet",
            "--verify",
            reservedBranchRef,
        ]) !== undefined
    if (hasLocalBranch) {
        return [".aico", reservedBranchName]
    }
    const [remoteBranchName, ...otherRemoteBranchNames] =
        readRemoteBranchNames(projectRoot)
    if (remoteBranchName === undefined) {
        return undefined
    }
    if (otherRemoteBranchNames.length > 0) {
        const remoteNames = [remoteBranchName, ...otherRemoteBranchNames]
            .map((name) => name.slice(0, -reservedBranchName.length - 1))
            .join(", ")
        throw new UserError(
            `Branch ${reservedBranchName} exists on several remotes, ${remoteNames}: choose one with \`git branch --track ${reservedBranchName} <remote>/${reservedBranchName}\`, then run AICo again.`,
        )
    }
    return ["--track", "-b", reservedBranchName, ".aico", remoteBranchName]
}

export async function openReservedBranch(projectRoot: string): Promise<void> {
    const [projectEntries, aicoFolderEntries] = await Promise.all([
        listFolderEntries(projectRoot),
        listFolderEntries(getAicoFolderPath(projectRoot)),
    ])
    const isWorkingCopyTop = projectEntries.some(({ name }) => name === ".git")
    if (!isWorkingCopyTop || aicoFolderEntries.length > 0) {
        return
    }
    freeReservedBranch(projectRoot)
    const checkoutArgs = readCheckoutArgs(projectRoot)
    if (checkoutArgs === undefined) {
        return
    }
    runGitOrThrow(projectRoot, ["worktree", "add", "-q", ...checkoutArgs])
    await excludeAicoFolder(projectRoot)
}
