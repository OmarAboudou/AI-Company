import { afterEach, beforeEach } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Subprocess } from "bun"
import { createGitRepository } from "../git/create-git-repository.testing.ts"
import { startInteractiveCli } from "./start-interactive-cli.testing.ts"

const cliPath = join(import.meta.dir, "main.ts")

type RunOptions = { stdin?: string; env?: Record<string, string> }

export function useTemporaryProject() {
    let projectRoot = ""
    let home = ""
    const startedProcesses: Subprocess[] = []

    beforeEach(async () => {
        ;[projectRoot, home] = await Promise.all([
            mkdtemp(join(tmpdir(), "llmco-")),
            mkdtemp(join(tmpdir(), "llmco-home-")),
        ])
        createGitRepository(projectRoot, {
            name: "Test User",
            email: "test@example.com",
        })
    })

    afterEach(async () => {
        for (const startedProcess of startedProcesses.splice(0)) {
            startedProcess.kill()
        }
        await Promise.all(
            [projectRoot, home].map((folderPath) =>
                rm(folderPath, { recursive: true, force: true }),
            ),
        )
    })

    // No test may reach a real API: the CLI never sees this machine's API
    // keys, nor the credentials an SDK could find in its home directory.
    // Nor does it see who this machine's shell is switched to, nor where
    // its zsh keeps its startup files.
    function readCliEnvironment(env: Record<string, string>) {
        const keptEntries = Object.entries(process.env).filter(
            ([name]) => !/^((ANTHROPIC|OPENAI|LLMCO)_|ZDOTDIR$)/.test(name),
        )
        return { ...Object.fromEntries(keptEntries), HOME: home, ...env }
    }

    function createSpawnOptions({ stdin = "", env = {} }: RunOptions) {
        return {
            cwd: projectRoot,
            env: readCliEnvironment(env),
            stdin: new TextEncoder().encode(stdin),
        }
    }

    function run(options: RunOptions, args: string[]) {
        const cliProcess = Bun.spawnSync(
            [process.execPath, cliPath, ...args],
            createSpawnOptions(options),
        )
        return {
            exitCode: cliProcess.exitCode,
            stdout: cliProcess.stdout.toString(),
            stderr: cliProcess.stderr.toString(),
        }
    }

    // Bun.spawnSync blocks this process, so a fake API server started by
    // the test would never answer the CLI.
    async function runAsync(options: RunOptions, args: string[]) {
        const cliProcess = Bun.spawn([process.execPath, cliPath, ...args], {
            ...createSpawnOptions(options),
            stdout: "pipe",
            stderr: "pipe",
        })
        const [stdout, stderr, exitCode] = await Promise.all([
            new Response(cliProcess.stdout).text(),
            new Response(cliProcess.stderr).text(),
            cliProcess.exited,
        ])
        return { exitCode, stdout, stderr }
    }

    function start(env: Record<string, string>, args: string[]) {
        const interactiveCli = startInteractiveCli(
            [process.execPath, cliPath, ...args],
            { cwd: projectRoot, env: readCliEnvironment(env) },
        )
        startedProcesses.push(interactiveCli.process)
        return interactiveCli
    }

    return {
        runCli: (...args: string[]) => run({}, args),
        runCliWithStdin: (stdin: string, ...args: string[]) =>
            run({ stdin }, args),
        runCliWithEnv: (env: Record<string, string>, ...args: string[]) =>
            run({ env }, args),
        runCliAsync: (env: Record<string, string>, ...args: string[]) =>
            runAsync({ env }, args),
        startCliWithEnv: (env: Record<string, string>, ...args: string[]) =>
            start(env, args),
        getProjectPath: (...segments: string[]) =>
            join(projectRoot, ...segments),
        getHomePath: (...segments: string[]) => join(home, ...segments),
    }
}
