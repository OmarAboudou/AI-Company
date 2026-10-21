import { beforeEach, describe, expect, test } from "bun:test"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createEmployee } from "../../../organization/employee/create-employee.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

beforeEach(async () => {
    const projectRoot = getProjectPath()
    await createCompany(projectRoot, { name: "Acme", description: "" })
    await createEmployee(projectRoot, "julie", { name: "Julie", kind: "human" })
})

describe("llmco current-human set", () => {
    test("says how to set up llmco's shell function, which it needs", () => {
        const switching = runCli("current-human", "set", "julie")

        expect(switching.exitCode).toBe(1)
        expect(switching.stderr).toContain("llmco shell init bash --install")
    })

    test("--shell-code prints the code switching to the employee", () => {
        const exportLine = 'export LLMCO_CURRENT_HUMAN_ID="julie"\n'

        const switching = runCli(
            "current-human",
            "set",
            "julie",
            "--shell-code",
        )

        expect(switching.exitCode).toBe(0)
        expect(switching.stdout).toStartWith(exportLine)
    })

    test("requires an employee id", () => {
        const switching = runCli("current-human", "set", "--shell-code")

        expect(switching.exitCode).toBe(1)
        expect(switching.stderr).toContain("missing required argument")
    })

    test("--shell-code prints nothing to evaluate for a refused id", () => {
        const switching = runCli("current-human", "set", "eve", "--shell-code")

        expect(switching.exitCode).toBe(1)
        expect(switching.stderr).toContain('No employee "eve".')
        expect(switching.stdout).toBe("")
    })
})
