// biome-ignore-all lint/suspicious/noTemplateCurlyInString: these strings are shell code, whose ${…} the shell expands.
import { describe, expect, test } from "bun:test"
import type { CurrentHuman } from "../../organization/human/read-current-human.ts"
import { buildSwitchHumanCode } from "./build-switch-human-code.ts"

const director: CurrentHuman = { kind: "director" }

function createEmployeeHuman(id: string): CurrentHuman {
    return { kind: "employee", employee: { id, name: id, kind: "human" } }
}

function runBash(
    currentHumans: CurrentHuman[],
    env: Record<string, string> = {},
): string {
    const script = [
        'PS1="$ "',
        'for code in "$@"; do eval "$code"; done',
        'printf "%s|%s" "${LLMCO_CURRENT_HUMAN_ID-unset}" "$PS1"',
    ].join("\n")
    const codes = currentHumans.map(buildSwitchHumanCode)
    const bash = Bun.spawnSync(
        ["bash", "--norc", "--noprofile", "-c", script, "bash", ...codes],
        { env: { PATH: process.env.PATH ?? "", ...env } },
    )
    return bash.stdout.toString()
}

describe("buildSwitchHumanCode", () => {
    test("switches the shell to the employee, shown in the prompt", () => {
        const shellState = runBash([createEmployeeHuman("julie")])

        expect(shellState).toBe("julie|(julie) $ ")
    })

    test("switches back to a director, restoring the prompt", () => {
        const shellState = runBash([createEmployeeHuman("julie"), director])

        expect(shellState).toBe("unset|$ ")
    })

    test("keeps the original prompt from one employee to the next", () => {
        const employeeHumans = ["julie", "bob"].map(createEmployeeHuman)

        const shellState = runBash(employeeHumans)

        expect(shellState).toBe("bob|(bob) $ ")
    })

    test("leaves the prompt alone with LLMCO_DISABLE_PROMPT", () => {
        const disabledPrompt = { LLMCO_DISABLE_PROMPT: "1" }

        const shellState = runBash(
            [createEmployeeHuman("julie")],
            disabledPrompt,
        )

        expect(shellState).toBe("julie|$ ")
    })
})
