// biome-ignore-all lint/suspicious/noTemplateCurlyInString: these strings are shell code, whose ${…} the shell expands.

import { beforeEach, describe, expect, test } from "bun:test"
import { chmod, mkdir } from "node:fs/promises"
import { join } from "node:path"
import { createCompany } from "../../../organization/company/create-company.ts"
import { assignPositionTemporarily } from "../../../organization/position/assign-position-temporarily.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"
import {
    isShellInstalled,
    runShell,
    type ShellRun,
} from "./run-shell.testing.ts"
import { shells } from "./shells.ts"

const { runCli, runCliWithEnv, getProjectPath, getHomePath } =
    useTemporaryProject()
const cliPath = join(import.meta.dir, "..", "..", "main.ts")
const printShellState =
    '_aico_update_prompt; printf "%s|%s" "${AICO_CURRENT_POSITION_ID-unset}" "$PS1"'
const printRegistrations: Record<(typeof shells)[number], string> = {
    bash: 'printf "%s" "$PROMPT_COMMAND"',
    zsh: 'printf "%s" "${precmd_functions[*]}"',
}

beforeEach(async () => {
    const projectRoot = getProjectPath()
    await createCompany(projectRoot, { name: "Acme", description: "" })
    await createPosition(projectRoot, "graphics", {
        title: "Graphics",
        description: "",
    })
    await assignPositionTemporarily(projectRoot, "graphics", {
        kind: "directors",
    })
    const aicoPath = getHomePath("bin", "aico")
    await Bun.write(
        aicoPath,
        `#!/bin/sh\nexec "${process.execPath}" "${cliPath}" "$@"\n`,
    )
    await chmod(aicoPath, 0o755)
})

for (const shell of shells) {
    describe.skipIf(!isShellInstalled(shell))(
        `aico shell init ${shell}`,
        () => {
            function runFunction(...commands: string[]): ShellRun {
                const script = [
                    `eval "$(aico shell init ${shell})"`,
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

            test("prints a function through which current-position set switches the shell", () => {
                const shellRun = runFunction(
                    "aico current-position set graphics",
                    printShellState,
                )

                expect(shellRun.stdout).toBe("graphics|(director @graphics) $ ")
            })

            test("lets current-position clear switch back", () => {
                const shellRun = runFunction(
                    "aico current-position set graphics",
                    "aico current-position clear",
                    printShellState,
                )

                expect(shellRun.stdout).toBe("unset|(director) $ ")
            })

            test("leaves the shell as it was when current-position set refuses", () => {
                const shellRun = runFunction(
                    "aico current-position set support",
                    printShellState,
                )

                expect(shellRun.stderr).toContain('No position "support".')
                expect(shellRun.stdout).toBe("unset|(director) $ ")
            })

            test("shows no label outside an AICo project", () => {
                const shellRun = runFunction('cd "$HOME"', printShellState)

                expect(shellRun.stdout).toBe("unset|$ ")
            })

            test("keeps one label across prompts, and none once disabled", () => {
                const shellRun = runFunction(
                    "_aico_update_prompt",
                    printShellState,
                    "AICO_DISABLE_PROMPT=1",
                    printShellState,
                )

                expect(shellRun.stdout).toBe("unset|(director) $ unset|$ ")
            })

            test("updates the label before each prompt, registered once", () => {
                const shellRun = runFunction(
                    `eval "$(aico shell init ${shell})"`,
                    printRegistrations[shell],
                )

                expect(shellRun.stdout).toBe("_aico_update_prompt")
            })

            test("passes the other commands to aico", () => {
                const shellRun = runFunction(
                    "aico current-position set graphics",
                    "aico current-position",
                )

                expect(shellRun.stdout).toBe("graphics\n")
            })
        },
    )
}

describe("aico shell init", () => {
    test("refuses a shell it doesn't set up", () => {
        const init = runCli("shell", "init", "fish")

        expect(init.exitCode).toBe(1)
        expect(init.stderr).toContain("Allowed choices are bash, zsh.")
    })
})

describe("aico shell init --install", () => {
    test("adds the line evaluating the function to ~/.bashrc", async () => {
        await Bun.write(getHomePath(".bashrc"), "alias ll='ls -l'\n")

        const installation = runCli("shell", "init", "bash", "--install")

        const rcText = await Bun.file(getHomePath(".bashrc")).text()
        expect(installation.exitCode).toBe(0)
        expect(rcText).toStartWith("alias ll='ls -l'\n")
        expect(rcText).toEndWith('eval "$(aico shell init bash)"\n')
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
        expect(rcText).toContain('eval "$(aico shell init zsh)"')
    })
})
