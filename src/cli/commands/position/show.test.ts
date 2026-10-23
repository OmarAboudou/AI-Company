import { beforeEach, describe, expect, test } from "bun:test"
import { saveExampleLlmModel } from "../../../llm/model/save-example-llm-model.testing.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createEmployee } from "../../../organization/employee/create-employee.ts"
import { assignPosition } from "../../../organization/position/assign-position.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico position show", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme" })
        await saveExampleLlmModel(projectRoot)
        await Promise.all([
            createPosition(projectRoot, "developer", {
                title: "Developer",
                description: "",
            }),
            createPosition(projectRoot, "designer", {
                title: "Designer",
                description: "",
            }),
            createEmployee(projectRoot, "omar", {
                name: "Omar",
                kind: "llm",
                providerId: "anthropic",
                modelId: "opus",
            }),
        ])
        await assignPosition(projectRoot, "developer", "omar")
    })

    test("says who holds the position: an employee, or the user", () => {
        const developerShow = runCli("position", "show", "developer").stdout
        const designerShow = runCli("position", "show", "designer").stdout

        expect(developerShow).toBe("# Developer\n\nheld by: omar\n\n\n")
        expect(designerShow).toBe("# Designer\n\nheld by: you\n\n\n")
    })

    test("fails for an unknown position", () => {
        expect(runCli("position", "show", "tester").exitCode).toBe(1)
    })
})
