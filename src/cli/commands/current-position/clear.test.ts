import { describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli } = useTemporaryProject()

describe("aico current-position clear", () => {
    test("says how to set up AICo's shell function, which it needs", () => {
        const clearing = runCli("current-position", "clear")

        expect(clearing.exitCode).toBe(1)
        expect(clearing.stderr).toContain("aico shell init bash --install")
    })

    test("--shell-code prints the code clearing the selection", () => {
        const clearing = runCli("current-position", "clear", "--shell-code")

        expect(clearing.exitCode).toBe(0)
        expect(clearing.stdout).toBe("unset AICO_CURRENT_POSITION_ID\n")
    })
})
