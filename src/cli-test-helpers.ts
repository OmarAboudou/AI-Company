import { afterEach, beforeEach } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const cliPath = join(import.meta.dir, "cli.ts")

export function useTemporaryProject() {
    let projectRoot = ""

    beforeEach(async () => {
        projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
        for (const args of [
            ["init", "-q"],
            ["config", "user.name", "Test User"],
            ["config", "user.email", "test@example.com"],
        ]) {
            Bun.spawnSync(["git", ...args], { cwd: projectRoot })
        }
    })

    afterEach(async () => {
        await rm(projectRoot, { recursive: true, force: true })
    })

    function run(
        { stdin = "", env = {} }: { stdin?: string; env?: object },
        args: string[],
    ) {
        const result = Bun.spawnSync([process.execPath, cliPath, ...args], {
            cwd: projectRoot,
            env: { ...process.env, ...env },
            stdin: new TextEncoder().encode(stdin),
        })
        return {
            exitCode: result.exitCode,
            stdout: result.stdout.toString(),
            stderr: result.stderr.toString(),
        }
    }

    return {
        runCli: (...args: string[]) => run({}, args),
        runCliWithStdin: (stdin: string, ...args: string[]) =>
            run({ stdin }, args),
        runCliWithEnv: (env: Record<string, string>, ...args: string[]) =>
            run({ env }, args),
        projectPath: (...segments: string[]) => join(projectRoot, ...segments),
    }
}
