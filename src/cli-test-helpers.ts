import { afterEach, beforeEach } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const cliPath = join(import.meta.dir, "cli.ts")

export function useTemporaryProject() {
    let projectRoot = ""

    beforeEach(async () => {
        projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
    })

    afterEach(async () => {
        await rm(projectRoot, { recursive: true, force: true })
    })

    function runCliWithStdin(stdin: string, ...args: string[]) {
        const result = Bun.spawnSync([process.execPath, cliPath, ...args], {
            cwd: projectRoot,
            stdin: new TextEncoder().encode(stdin),
        })
        return {
            exitCode: result.exitCode,
            stdout: result.stdout.toString(),
            stderr: result.stderr.toString(),
        }
    }

    return {
        runCli: (...args: string[]) => runCliWithStdin("", ...args),
        runCliWithStdin,
        projectPath: (...segments: string[]) => join(projectRoot, ...segments),
    }
}
