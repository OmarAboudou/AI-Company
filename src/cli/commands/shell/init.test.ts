// biome-ignore-all lint/suspicious/noTemplateCurlyInString: these strings are shell code, whose ${…} the shell expands.
import { beforeEach, describe, expect, test } from "bun:test"
import { chmod } from "node:fs/promises"
import { join } from "node:path"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const { runCli, getProjectPath, getHomePath } = useTemporaryProject()
const cliPath = join(import.meta.dir, "..", "..", "main.ts")
const printShellState =
    'printf "%s|%s" "${LLMCO_CURRENT_HUMAN_ID-unset}" "$PS1"'

beforeEach(async () => {
    runCli("init", "-n", "Acme")
    runCli("employee", "create", "human", "julie", "-n", "Julie")
    const llmcoPath = getHomePath("bin", "llmco")
    await Bun.write(
        llmcoPath,
        `#!/bin/sh\nexec "${process.execPath}" "${cliPath}" "$@"\n`,
    )
    await chmod(llmcoPath, 0o755)
})

function runBash(...commands: string[]) {
    const script = ['eval "$(llmco shell init bash)"', 'PS1="$ "', ...commands]
    const bash = Bun.spawnSync(
        ["bash", "--norc", "--noprofile", "-c", script.join("\n")],
        {
            cwd: getProjectPath(),
            env: {
                PATH: `${getHomePath("bin")}:${process.env.PATH}`,
                HOME: getHomePath(),
            },
        },
    )
    return { stdout: bash.stdout.toString(), stderr: bash.stderr.toString() }
}

describe("llmco shell init bash", () => {
    test("prints a function through which switch-to-human switches the shell", () => {
        const shellRun = runBash("llmco switch-to-human julie", printShellState)

        expect(shellRun.stdout).toBe("julie|(julie) $ ")
    })

    test("lets switch-to-director switch back", () => {
        const shellRun = runBash(
            "llmco switch-to-human julie",
            "llmco switch-to-director",
            printShellState,
        )

        expect(shellRun.stdout).toBe("unset|$ ")
    })

    test("leaves the shell as it was when switch-to-human refuses", () => {
        const shellRun = runBash("llmco switch-to-human eve", printShellState)

        expect(shellRun.stderr).toContain('No employee "eve".')
        expect(shellRun.stdout).toBe("unset|$ ")
    })

    test("passes the other commands to llmco", () => {
        const shellRun = runBash("llmco switch-to-human julie", "llmco whoami")

        expect(shellRun.stdout).toStartWith("Julie (julie), a human employee")
    })
})

describe("llmco shell init", () => {
    test("refuses a shell it doesn't set up", () => {
        const init = runCli("shell", "init", "fish")

        expect(init.exitCode).toBe(1)
        expect(init.stderr).toContain("Allowed choices are bash, zsh.")
    })
})
