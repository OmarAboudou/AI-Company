import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { lockOperations } from "./lock-operations.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "aico-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function getLockFilePath() {
    return join(projectRoot, ".aico", ".state", "operation.lock")
}

async function readStoppedProcessId(): Promise<number> {
    const stoppedProcess = Bun.spawn(["true"])
    await stoppedProcess.exited
    return stoppedProcess.pid
}

describe("lockOperations", () => {
    test("takes the lock, which its release gives back", async () => {
        const lock = await lockOperations(projectRoot)
        const isLockedMeanwhile = await Bun.file(getLockFilePath()).exists()
        await lock.release()

        const nextLock = await lockOperations(projectRoot, { maxWaitMs: 0 })
        await nextLock.release()

        expect(isLockedMeanwhile).toBe(true)
        expect(await Bun.file(getLockFilePath()).exists()).toBe(false)
    })

    test("keeps the lock in the local state, which git ignores", async () => {
        const lock = await lockOperations(projectRoot)
        await lock.release()

        const stateFolderPath = join(projectRoot, ".aico", ".state")
        const gitignore = Bun.file(join(stateFolderPath, ".gitignore"))
        expect(await gitignore.text()).toContain("*")
    })

    test("waits for the process that holds the lock to release it", async () => {
        const lock = await lockOperations(projectRoot)
        const releaseTime = Date.now() + 100
        setTimeout(() => lock.release(), 100)

        const nextLock = await lockOperations(projectRoot)
        await nextLock.release()

        expect(Date.now()).toBeGreaterThanOrEqual(releaseTime)
    })

    test("gives up after a while, naming the process that holds it", async () => {
        const lock = await lockOperations(projectRoot)

        const locking = lockOperations(projectRoot, { maxWaitMs: 50 })

        await expect(locking).rejects.toThrow(UserError)
        await expect(locking).rejects.toThrow(`process ${process.pid} has`)
        await lock.release()
    })

    test("takes over the lock of a process that stopped holding it", async () => {
        const lockFilePath = getLockFilePath()
        await Bun.write(lockFilePath, `${await readStoppedProcessId()}\n`)

        const lock = await lockOperations(projectRoot, { maxWaitMs: 0 })

        expect(await Bun.file(lockFilePath).text()).toBe(`${process.pid}\n`)
        await lock.release()
    })
})
