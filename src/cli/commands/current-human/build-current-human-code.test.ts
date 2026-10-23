// biome-ignore-all lint/suspicious/noTemplateCurlyInString: these strings are shell code, whose ${…} the shell expands.
import { describe, expect, test } from "bun:test"
import type { CurrentHuman } from "../../../organization/human/read-current-human.ts"
import { isShellInstalled, runShell } from "../shell/run-shell.testing.ts"
import { shells } from "../shell/shells.ts"
import { buildCurrentHumanCode } from "./build-current-human-code.ts"

const director: CurrentHuman = { kind: "director" }
const julie: CurrentHuman = {
    kind: "employee",
    employee: { id: "julie", name: "Julie", kind: "human" },
}

for (const shell of shells) {
    describe.skipIf(!isShellInstalled(shell))(
        `buildCurrentHumanCode in ${shell}`,
        () => {
            function runSwitches(currentHumans: CurrentHuman[]): string {
                const script = [
                    'for code in "$@"; do eval "$code"; done',
                    'printf "%s|%s" "${AICO_CURRENT_HUMAN_ID-unset}" "${AICO_CURRENT_POSITION_ID-unset}"',
                ].join("\n")
                const codes = currentHumans.map(buildCurrentHumanCode)
                return runShell(shell, script, {
                    args: codes,
                    env: {
                        PATH: process.env.PATH ?? "",
                        AICO_CURRENT_POSITION_ID: "graphics",
                    },
                }).stdout
            }

            test("switches to the employee, clearing the selected position", () => {
                const shellState = runSwitches([julie])

                expect(shellState).toBe("julie|unset")
            })

            test("switches back to a director, clearing the selected position", () => {
                const shellState = runSwitches([julie, director])

                expect(shellState).toBe("unset|unset")
            })
        },
    )
}
