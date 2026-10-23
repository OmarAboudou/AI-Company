import { beforeEach, describe, expect, test } from "bun:test"
import { saveExampleLlmModel } from "../../../../llm/model/save-example-llm-model.testing.ts"
import { createCompany } from "../../../../organization/company/create-company.ts"
import { createEmployee } from "../../../../organization/employee/create-employee.ts"
import { assignPosition } from "../../../../organization/position/assign-position.ts"
import { createPosition } from "../../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

const interimEmployee = ["position", "interim", "employee"]

function getPositionStatePath(id: string): string {
    return getProjectPath(".aico", ".state", "positions", `${id}.json`)
}

async function loadPositionStateFile(id: string): Promise<unknown> {
    const file = Bun.file(getPositionStatePath(id))
    return (await file.exists()) ? file.json() : undefined
}

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

    const julieWorker = { kind: "employee", employeeId: "julie" }

    test("assign-temporarily needs employee or directors first", async () => {
        const interim = runCli("position", "interim", "developer", "julie")

        expect(interim.exitCode).toBe(1)
        expect(interim.stderr).toContain("unknown command 'developer'")
        expect(await loadPositionStateFile("developer")).toBeUndefined()
    })

    test("interim and end-interim are aliases", async () => {
        const interim = runCli(...interimEmployee, "developer", "julie")
        const during = await loadPositionStateFile("developer")
        const interimEnd = runCli("position", "end-interim", "developer")

        expect(interim.exitCode).toBe(0)
        expect(during).toEqual({ temporaryAssignment: julieWorker })
        expect(interimEnd.exitCode).toBe(0)
        expect(await loadPositionStateFile("developer")).toBeUndefined()
    })
})
