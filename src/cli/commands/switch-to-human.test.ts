import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../use-temporary-project.ts"

const { runCli } = useTemporaryProject()

beforeEach(() => {
    runCli("init", "-n", "Acme")
    runCli("employee", "create", "human", "julie", "-n", "Julie")
})

describe("llmco switch-to-human", () => {
    test("says how to set up llmco's shell function, which it needs", () => {
        const switching = runCli("switch-to-human", "julie")

        expect(switching.exitCode).toBe(1)
        expect(switching.stderr).toContain("llmco shell init bash --install")
    })

    test("--shell-code prints the code switching to the employee", () => {
        const exportLine = 'export LLMCO_CURRENT_HUMAN_ID="julie"\n'

        const switching = runCli("switch-to-human", "julie", "--shell-code")

        expect(switching.exitCode).toBe(0)
        expect(switching.stdout).toStartWith(exportLine)
    })

    test("requires an employee id", () => {
        const switching = runCli("switch-to-human", "--shell-code")

        expect(switching.exitCode).toBe(1)
        expect(switching.stderr).toContain("missing required argument")
    })

    test("--shell-code prints nothing to evaluate for a refused id", () => {
        const switching = runCli("switch-to-human", "eve", "--shell-code")

        expect(switching.exitCode).toBe(1)
        expect(switching.stderr).toContain('No employee "eve".')
        expect(switching.stdout).toBe("")
    })
})
