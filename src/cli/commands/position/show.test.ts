import { beforeEach, describe, expect, test } from "bun:test"
import { saveExampleLlmModel } from "../../../llm/model/save-example-llm-model.testing.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createEmployee } from "../../../organization/employee/create-employee.ts"
import { assignPosition } from "../../../organization/position/assign-position.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

const interimEmployee = ["position", "interim", "employee"]
const interimDirectors = ["position", "interim", "directors"]

describe("aico position", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
        await saveExampleLlmModel(projectRoot)
    })

    test("show fails for an unknown position", () => {
        expect(runCli("position", "show", "developer").exitCode).toBe(1)
    })
})

describe("aico position assign-temporarily and unassign-temporarily", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
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
            createEmployee(projectRoot, "julie", {
                name: "Julie",
                kind: "llm",
                providerId: "anthropic",
                modelId: "opus",
            }),
            createEmployee(projectRoot, "bob", {
                name: "Bob",
                kind: "llm",
                providerId: "anthropic",
                modelId: "opus",
            }),
        ])
        await assignPosition(projectRoot, "developer", "omar")
    })

    test("show says who works the position temporarily", () => {
        runCli(...interimEmployee, "developer", "julie")
        runCli(...interimDirectors, "designer")

        const developerShow = runCli("position", "show", "developer").stdout
        const designerShow = runCli("position", "show", "designer").stdout

        expect(developerShow).toBe(
            "# Developer\n\ncurrent employee: julie (temporarily)\ndefault employee: omar\n\n\n",
        )
        expect(designerShow).toBe(
            "# Designer\n\ncurrent employee: the repository's git users (temporarily)\ndefault employee: (none)\n\n\n",
        )
    })
})
