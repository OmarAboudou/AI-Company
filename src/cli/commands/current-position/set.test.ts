import { beforeEach, describe, expect, test } from "bun:test"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createEmployee } from "../../../organization/employee/create-employee.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, runCliWithEnv, getProjectPath } = useTemporaryProject()

beforeEach(async () => {
    const projectRoot = getProjectPath()
    await createCompany(projectRoot, { name: "Acme", description: "" })
    await Promise.all([
        createEmployee(projectRoot, "julie", { name: "Julie", kind: "human" }),
        createPosition(projectRoot, "graphics", {
            title: "Graphics",
            description: "",
        }),
    ])
})

describe("llmco current-position set", () => {
    test("says how to set up llmco's shell function, which it needs", () => {
        const selection = runCli("current-position", "set", "director")

        expect(selection.exitCode).toBe(1)
        expect(selection.stderr).toContain("llmco shell init bash --install")
    })

    test("--shell-code prints the code selecting the position", () => {
        const exportLine = 'export LLMCO_CURRENT_POSITION_ID="director"\n'

        const selection = runCli(
            "current-position",
            "set",
            "director",
            "--shell-code",
        )

        expect(selection.exitCode).toBe(0)
        expect(selection.stdout).toBe(exportLine)
    })

    test("--shell-code prints nothing for a position you don't work", () => {
        const julieEnv = { LLMCO_CURRENT_HUMAN_ID: "julie" }
        const selectionArgs = ["current-position", "set", "graphics"]

        const selection = runCliWithEnv(
            julieEnv,
            ...selectionArgs,
            "--shell-code",
        )

        expect(selection.exitCode).toBe(1)
        expect(selection.stderr).toContain("assign-temporarily employee")
        expect(selection.stdout).toBe("")
    })
})
