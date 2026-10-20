import { describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const { runCli } = useTemporaryProject()

describe("llmco current-human clear", () => {
    test("says how to set up llmco's shell function, which it needs", () => {
        const switching = runCli("current-human", "clear")

        expect(switching.exitCode).toBe(1)
        expect(switching.stderr).toContain("llmco shell init bash --install")
    })

    test("--shell-code prints the code switching back to a director", () => {
        const switching = runCli("current-human", "clear", "--shell-code")

        expect(switching.exitCode).toBe(0)
        expect(switching.stdout).toStartWith("unset LLMCO_CURRENT_HUMAN_ID\n")
    })
})
