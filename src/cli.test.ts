import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const cliPath = join(import.meta.dir, "cli.ts")

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function runCli(...args: string[]) {
    const result = Bun.spawnSync([process.execPath, cliPath, ...args], {
        cwd: projectRoot,
    })
    return {
        exitCode: result.exitCode,
        stdout: result.stdout.toString(),
        stderr: result.stderr.toString(),
    }
}

describe("llmco init", () => {
    test("creates a company that company show displays", () => {
        const init = runCli(
            "init",
            "--name",
            "Acme",
            "--description",
            "We build things.",
        )
        expect(init.exitCode).toBe(0)

        const show = runCli("company", "show")
        expect(show.exitCode).toBe(0)
        expect(show.stdout).toBe("# Acme\n\nWe build things.\n")
    })

    test("refuses to overwrite an existing company", () => {
        runCli("init", "--name", "Acme")

        const second = runCli("init", "--name", "Other")

        expect(second.exitCode).toBe(1)
        expect(runCli("company", "show").stdout).toContain("# Acme")
    })

    test("requires a name", () => {
        expect(runCli("init").exitCode).toBe(1)
    })
})

describe("llmco company show", () => {
    test("fails when there is no company", () => {
        expect(runCli("company", "show").exitCode).toBe(1)
    })
})

test("prints usage for an unknown command", () => {
    const result = runCli("unknown")

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain("Usage:")
})
