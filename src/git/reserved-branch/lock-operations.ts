import { readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { getStateFolderPath } from "../../files/get-state-folder-path.ts"
import { saveStateGitignore } from "../../files/save-state-gitignore.ts"
import { UserError } from "../../user-error.ts"

const retryDelayMs = 20

export type OperationsLock = { release(): Promise<void> }

function getLockFilePath(projectRoot: string): string {
    return join(getStateFolderPath(projectRoot), "operation.lock")
}

function isExistingFileError(error: unknown): boolean {
    return error instanceof Error && "code" in error && error.code === "EEXIST"
}

function isRunning(processId: number): boolean {
    try {
        process.kill(processId, 0)
        return true
    } catch (error) {
        return (
            error instanceof Error && "code" in error && error.code === "EPERM"
        )
    }
}

async function readHolderProcessId(
    lockFilePath: string,
): Promise<number | undefined> {
    const text = await readFile(lockFilePath, "utf8").catch(() => "")
    const processId = Number.parseInt(text, 10)
    return Number.isNaN(processId) ? undefined : processId
}

async function deleteLockOfStoppedProcess(
    lockFilePath: string,
    holderProcessId: number,
): Promise<void> {
    if ((await readHolderProcessId(lockFilePath)) === holderProcessId) {
        await rm(lockFilePath, { force: true })
    }
}

export async function lockOperations(
    projectRoot: string,
    { maxWaitMs = 30_000 }: { maxWaitMs?: number } = {},
): Promise<OperationsLock> {
    const lockFilePath = getLockFilePath(projectRoot)
    await saveStateGitignore(projectRoot)
    const deadline = Date.now() + maxWaitMs
    while (true) {
        try {
            await writeFile(lockFilePath, `${process.pid}\n`, { flag: "wx" })
            return { release: () => rm(lockFilePath, { force: true }) }
        } catch (error) {
            if (!isExistingFileError(error)) {
                throw error
            }
        }
        const holderProcessId = await readHolderProcessId(lockFilePath)
        if (holderProcessId !== undefined && !isRunning(holderProcessId)) {
            await deleteLockOfStoppedProcess(lockFilePath, holderProcessId)
            continue
        }
        if (Date.now() >= deadline) {
            const holderName =
                holderProcessId === undefined
                    ? "Another AICo process"
                    : `AICo's process ${holderProcessId}`
            throw new UserError(
                `${holderName} has been changing the company for ${maxWaitMs / 1000} seconds: run your command again once it has finished, or stop it.`,
            )
        }
        await Bun.sleep(retryDelayMs)
    }
}
