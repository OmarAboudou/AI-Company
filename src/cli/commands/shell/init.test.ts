// biome-ignore-all lint/suspicious/noTemplateCurlyInString: these strings are shell code, whose ${…} the shell expands.
import { beforeEach, describe, expect, test } from "bun:test"
import { chmod, mkdir } from "node:fs/promises"
import { join } from "node:path"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const { runCli, runCliWithEnv, getProjectPath, getHomePath } =
    useTemporaryProject()
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

describe("llmco shell init --install", () => {
    test("adds the line evaluating the function to ~/.bashrc", async () => {
        await Bun.write(getHomePath(".bashrc"), "alias ll='ls -l'\n")

        const installation = runCli("shell", "init", "bash", "--install")

        const rcText = await Bun.file(getHomePath(".bashrc")).text()
        expect(installation.exitCode).toBe(0)
        expect(rcText).toStartWith("alias ll='ls -l'\n")
        expect(rcText).toEndWith('eval "$(llmco shell init bash)"\n')
    })

    test("refuses a startup file that already evaluates it", () => {
        runCli("shell", "init", "bash", "--install")

        const installation = runCli("shell", "init", "bash", "--install")

        expect(installation.exitCode).toBe(1)
        expect(installation.stderr).toContain("already evaluates")
    })

    test("adds it to the .zshrc in ZDOTDIR for zsh", async () => {
        const zdotdirEnv = { ZDOTDIR: getHomePath("zsh") }
        await mkdir(zdotdirEnv.ZDOTDIR)

        runCliWithEnv(zdotdirEnv, "shell", "init", "zsh", "-i")

        const rcText = await Bun.file(getHomePath("zsh", ".zshrc")).text()
        expect(rcText).toContain('eval "$(llmco shell init zsh)"')
    })
})
