// biome-ignore-all lint/suspicious/noTemplateCurlyInString: these strings are shell code, whose ${…} the shell expands.
import { beforeEach, describe, expect, test } from "bun:test"
import { chmod, mkdir } from "node:fs/promises"
import { join } from "node:path"
import { useTemporaryProject } from "../../use-temporary-project.ts"
import { isShellInstalled, runShell, type ShellRun } from "./run-shell.ts"
import { shells } from "./shells.ts"

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

for (const shell of shells) {
    describe.skipIf(!isShellInstalled(shell))(
        `llmco shell init ${shell}`,
        () => {
            function runFunction(...commands: string[]): ShellRun {
                const script = [
                    `eval "$(llmco shell init ${shell})"`,
                    'PS1="$ "',
                    ...commands,
                ]
                return runShell(shell, script.join("\n"), {
                    cwd: getProjectPath(),
                    env: {
                        PATH: `${getHomePath("bin")}:${process.env.PATH}`,
                        HOME: getHomePath(),
                    },
                })
            }

            test("prints a function through which current-human set switches the shell", () => {
                const shellRun = runFunction(
                    "llmco current-human set julie",
                    printShellState,
                )

                expect(shellRun.stdout).toBe("julie|(julie) $ ")
            })

            test("lets current-human clear switch back", () => {
                const shellRun = runFunction(
                    "llmco current-human set julie",
                    "llmco current-human clear",
                    printShellState,
                )

                expect(shellRun.stdout).toBe("unset|$ ")
            })

            test("leaves the shell as it was when current-human set refuses", () => {
                const shellRun = runFunction(
                    "llmco current-human set eve",
                    printShellState,
                )

                expect(shellRun.stderr).toContain('No employee "eve".')
                expect(shellRun.stdout).toBe("unset|$ ")
            })

            test("passes the other commands to llmco", () => {
                const shellRun = runFunction(
                    "llmco current-human set julie",
                    "llmco whoami",
                )

                expect(shellRun.stdout).toStartWith("Julie (julie), a human")
            })
        },
    )
}

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
