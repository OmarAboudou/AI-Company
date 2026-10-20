// biome-ignore-all lint/suspicious/noTemplateCurlyInString: these strings are shell code, whose ${…} the shell expands.
import { describe, expect, test } from "bun:test"
import type { CurrentHuman } from "../../../organization/human/read-current-human.ts"
import { isShellInstalled, runShell } from "../shell/run-shell.ts"
import { shells } from "../shell/shells.ts"
import { buildCurrentHumanCode } from "./build-current-human-code.ts"

const director: CurrentHuman = { kind: "director" }

function createEmployeeHuman(id: string): CurrentHuman {
    return { kind: "employee", employee: { id, name: id, kind: "human" } }
}

for (const shell of shells) {
    describe.skipIf(!isShellInstalled(shell))(
        `buildCurrentHumanCode in ${shell}`,
        () => {
            function runSwitches(
                currentHumans: CurrentHuman[],
                env: Record<string, string> = {},
            ): string {
                const script = [
                    'PS1="$ "',
                    'for code in "$@"; do eval "$code"; done',
                    'printf "%s|%s" "${LLMCO_CURRENT_HUMAN_ID-unset}" "$PS1"',
                ].join("\n")
                const codes = currentHumans.map(buildCurrentHumanCode)
                return runShell(shell, script, {
                    args: codes,
                    env: { PATH: process.env.PATH ?? "", ...env },
                }).stdout
            }

            test("switches the shell to the employee, shown in the prompt", () => {
                const shellState = runSwitches([createEmployeeHuman("julie")])

                expect(shellState).toBe("julie|(julie) $ ")
            })

            test("switches back to a director, restoring the prompt", () => {
                const julie = createEmployeeHuman("julie")

                const shellState = runSwitches([julie, director])

                expect(shellState).toBe("unset|$ ")
            })

            test("keeps the original prompt from one employee to the next", () => {
                const employeeHumans = ["julie", "bob"].map(createEmployeeHuman)

                const shellState = runSwitches(employeeHumans)

                expect(shellState).toBe("bob|(bob) $ ")
            })

            test("leaves the prompt alone with LLMCO_DISABLE_PROMPT", () => {
                const julie = createEmployeeHuman("julie")
                const disabledPrompt = { LLMCO_DISABLE_PROMPT: "1" }

                const shellState = runSwitches([julie], disabledPrompt)

                expect(shellState).toBe("julie|$ ")
            })
        },
    )
}
