import { beforeEach, describe, expect, test } from "bun:test"
import { saveExampleLlmModel } from "../../../../llm/model/save-example-llm-model.testing.ts"
import { createCompany } from "../../../../organization/company/create-company.ts"
import { createEmployee } from "../../../../organization/employee/create-employee.ts"
import { assignPosition } from "../../../../organization/position/assign-position.ts"
import { createPosition } from "../../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

const interimEmployee = ["position", "interim", "employee"]
const interimDirectors = ["position", "interim", "directors"]

function getPositionStatePath(id: string): string {
    return getProjectPath(".aico", "positions", id, "state.json")
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
        ])
        await createEmployee(projectRoot, "omar", {
            name: "Omar",
            kind: "llm",
            providerId: "anthropic",
            modelId: "opus",
        })
        await createEmployee(projectRoot, "julie", {
            name: "Julie",
            kind: "llm",
            providerId: "anthropic",
            modelId: "opus",
        })
        await createEmployee(projectRoot, "bob", {
            name: "Bob",
            kind: "llm",
            providerId: "anthropic",
            modelId: "opus",
        })
        await assignPosition(projectRoot, "developer", "omar")
    })

    test("assign-temporarily without employee gives a vacant position to the directors", async () => {
        const interim = runCli(
            "position",
            "assign-temporarily",
            "directors",
            "designer",
        )

        expect(interim.exitCode).toBe(0)
        expect(interim.stdout).toBe(
            'Position "designer" is now assigned temporarily to the directors.\n',
        )
        expect(await loadPositionStateFile("designer")).toEqual({
            temporaryAssignment: { kind: "directors" },
        })
    })

    test.each(["--replace", "-r"])(
        "assign-temporarily %s replaces the temporary assignment",
        async (flag) => {
            runCli(...interimEmployee, "developer", "julie")

            const interim = runCli(...interimDirectors, "developer", flag)

            expect(interim.exitCode).toBe(0)
            expect(interim.stdout).toBe(
                'Position "developer" is now assigned temporarily to the directors instead of "julie".\n',
            )
            expect(await loadPositionStateFile("developer")).toEqual({
                temporaryAssignment: { kind: "directors" },
            })
        },
    )
})
