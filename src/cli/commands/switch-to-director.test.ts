import { describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../use-temporary-project.ts"

const { runCli } = useTemporaryProject()

describe("llmco switch-to-director", () => {
    test("says how to set up llmco's shell function, which it needs", () => {
        const switching = runCli("switch-to-director")

        expect(switching.exitCode).toBe(1)
        expect(switching.stderr).toContain("llmco shell init bash --install")
    })

    test("--shell-code prints the code switching back to a director", () => {
        const switching = runCli("switch-to-director", "--shell-code")

        expect(switching.exitCode).toBe(0)
        expect(switching.stdout).toStartWith("unset LLMCO_CURRENT_HUMAN_ID\n")
    })
})
