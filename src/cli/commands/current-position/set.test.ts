import { beforeEach, describe, expect, test } from "bun:test"
import { saveExampleLlmModel } from "../../../llm/model/save-example-llm-model.testing.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createEmployee } from "../../../organization/employee/create-employee.ts"
import { assignPosition } from "../../../organization/position/assign-position.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

beforeEach(async () => {
    const projectRoot = getProjectPath()
    await createCompany(projectRoot, { name: "Acme" })
    await createPosition(projectRoot, "graphics", {
        title: "Graphics",
        description: "",
    })
})

describe("aico current-position set", () => {
    test("says how to set up AICo's shell function, which it needs", () => {
        const selection = runCli("current-position", "set", "director")

        expect(selection.exitCode).toBe(1)
        expect(selection.stderr).toContain("aico shell init bash --install")
    })

    test("--shell-code prints the code selecting the position", () => {
        const exportLine = 'export AICO_CURRENT_POSITION_ID="director"\n'

        const selection = runCli(
            "current-position",
            "set",
            "director",
            "--shell-code",
        )

        expect(selection.exitCode).toBe(0)
        expect(selection.stdout).toBe(exportLine)
    })

    test("--shell-code prints nothing for a position an LLM employee holds", async () => {
        const projectRoot = getProjectPath()
        await saveExampleLlmModel(projectRoot)
        await createEmployee(projectRoot, "claude", {
            name: "Claude Senior",
            kind: "llm",
            providerId: "anthropic",
            modelId: "opus",
        })
        await assignPosition(projectRoot, "graphics", "claude")
        const selectionArgs = ["current-position", "set", "graphics"]

        const selection = runCli(...selectionArgs, "--shell-code")

        expect(selection.exitCode).toBe(1)
        expect(selection.stderr).toContain("`aico position unassign graphics`")
        expect(selection.stdout).toBe("")
    })
})
