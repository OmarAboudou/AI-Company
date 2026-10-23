import { describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli } = useTemporaryProject()

describe("aico current-human clear", () => {
    test("says how to set up AICo's shell function, which it needs", () => {
        const switching = runCli("current-human", "clear")

        expect(switching.exitCode).toBe(1)
        expect(switching.stderr).toContain("aico shell init bash --install")
    })

    test("--shell-code prints the code switching back to a director", () => {
        const unsetLine =
            "unset AICO_CURRENT_HUMAN_ID AICO_CURRENT_POSITION_ID\n"

        const switching = runCli("current-human", "clear", "--shell-code")

        expect(switching.exitCode).toBe(0)
        expect(switching.stdout).toStartWith(unsetLine)
    })
})
