import { afterEach, beforeEach } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const cliPath = join(import.meta.dir, "cli.ts")

type RunOptions = { stdin?: string; env?: Record<string, string> }

export function useTemporaryProject() {
    let projectRoot = ""
    let home = ""

    beforeEach(async () => {
        ;[projectRoot, home] = await Promise.all([
            mkdtemp(join(tmpdir(), "llmco-")),
            mkdtemp(join(tmpdir(), "llmco-home-")),
        ])
        for (const args of [
            ["init", "-q"],
            ["config", "user.name", "Test User"],
            ["config", "user.email", "test@example.com"],
        ]) {
            Bun.spawnSync(["git", ...args], { cwd: projectRoot })
        }
    })

    afterEach(async () => {
        await Promise.all(
            [projectRoot, home].map((dir) =>
                rm(dir, { recursive: true, force: true }),
            ),
        )
    })

    // No test may reach a real API: the CLI never sees this machine's API
    // keys, nor the credentials an SDK could find in its home directory.
    function environment(env: Record<string, string>) {
        const kept = Object.entries(process.env).filter(
            ([name]) => !/^(ANTHROPIC|OPENAI)_/.test(name),
        )
        return { ...Object.fromEntries(kept), HOME: home, ...env }
    }

    function spawnOptions({ stdin = "", env = {} }: RunOptions) {
        return {
            cwd: projectRoot,
            env: environment(env),
            stdin: new TextEncoder().encode(stdin),
        }
    }

    function run(options: RunOptions, args: string[]) {
        const result = Bun.spawnSync(
            [process.execPath, cliPath, ...args],
            spawnOptions(options),
        )
        return {
            exitCode: result.exitCode,
            stdout: result.stdout.toString(),
            stderr: result.stderr.toString(),
        }
    }

    // Bun.spawnSync blocks this process, so a fake API server started by
    // the test would never answer the CLI.
    async function runAsync(options: RunOptions, args: string[]) {
        const child = Bun.spawn([process.execPath, cliPath, ...args], {
            ...spawnOptions(options),
            stdout: "pipe",
            stderr: "pipe",
        })
        const [stdout, stderr, exitCode] = await Promise.all([
            new Response(child.stdout).text(),
            new Response(child.stderr).text(),
            child.exited,
        ])
        return { exitCode, stdout, stderr }
    }

    return {
        runCli: (...args: string[]) => run({}, args),
        runCliWithStdin: (stdin: string, ...args: string[]) =>
            run({ stdin }, args),
        runCliWithEnv: (env: Record<string, string>, ...args: string[]) =>
            run({ env }, args),
        runCliAsync: (env: Record<string, string>, ...args: string[]) =>
            runAsync({ env }, args),
        projectPath: (...segments: string[]) => join(projectRoot, ...segments),
        homePath: (...segments: string[]) => join(home, ...segments),
    }
}
