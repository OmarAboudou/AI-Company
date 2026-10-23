import { getAicoFolderPath } from "../../files/get-aico-folder-path.ts"
import { UserError } from "../../user-error.ts"
import { readGitCommitter } from "../read-git-committer.ts"
import { runGitOrThrow } from "../run-git-or-throw.ts"
import { isReservedBranchWorktree } from "./is-reserved-branch-worktree.ts"
import { lockOperations } from "./lock-operations.ts"
import { reservedBranchName } from "./reserved-branch.ts"

const foundChangesMessage =
    "Changes made by hand, or left by an interrupted operation"

let runningOperationName: string | undefined

function commitChanges(projectRoot: string, message: string): void {
    const aicoFolderPath = getAicoFolderPath(projectRoot)
    if (runGitOrThrow(aicoFolderPath, ["status", "--porcelain"]) === "") {
        return
    }
    runGitOrThrow(aicoFolderPath, ["add", "--all"])
    // The project's hooks check its code, not AICo's data.
    const commitArgs = ["commit", "-q", "--no-verify", "-m", message]
    runGitOrThrow(aicoFolderPath, commitArgs)
}

async function runLocked<Result>(
    projectRoot: string,
    operationName: string,
    operate: () => Promise<Result>,
): Promise<Result> {
    const lock = await lockOperations(projectRoot)
    try {
        commitChanges(projectRoot, foundChangesMessage)
        return await operate()
    } finally {
        try {
            commitChanges(projectRoot, operationName)
        } finally {
            await lock.release()
        }
    }
}

export async function runOperation<Result>(
    projectRoot: string,
    operationName: string,
    operate: () => Promise<Result>,
): Promise<Result> {
    if (runningOperationName !== undefined) {
        throw new Error(
            `"${operationName}" started during "${runningOperationName}": operations never overlap.`,
        )
    }
    if (!(await isReservedBranchWorktree(projectRoot))) {
        throw new UserError(
            `.aico/ isn't the worktree of branch ${reservedBranchName}, where AICo keeps the company: move it away, then run \`aico init\`.`,
        )
    }
    readGitCommitter(projectRoot)
    runningOperationName = operationName
    try {
        return await runLocked(projectRoot, operationName, operate)
    } finally {
        runningOperationName = undefined
    }
}
