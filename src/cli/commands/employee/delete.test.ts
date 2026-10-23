import { beforeEach, describe, expect, test } from "bun:test"
import { saveExampleLlmModel } from "../../../llm/model/save-example-llm-model.testing.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createEmployee } from "../../../organization/employee/create-employee.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

const interimEmployee = ["position", "interim", "employee"]

async function loadTemporaryAssignee(positionId: string): Promise<unknown> {
    const pathSegments = [".aico", "positions", positionId, "state.json"]
    const stateFile = Bun.file(getProjectPath(...pathSegments))
    return (await stateFile.exists())
        ? (await stateFile.json()).temporaryAssignment
        : undefined
}

function createEmployeeWorker(employeeId: string) {
    return { kind: "employee", employeeId }
}

describe("aico employee delete", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme" })
        await saveExampleLlmModel(projectRoot)
        await Promise.all([
            createEmployee(projectRoot, "omar", {
                name: "Omar",
                kind: "llm",
                providerId: "anthropic",
                modelId: "opus",
            }),
            createPosition(projectRoot, "developer", {
                title: "Developer",
                description: "",
            }),
            createPosition(projectRoot, "qa-tester", {
                title: "QA Tester",
                description: "",
            }),
        ])
    })

    test("delete removes an employee who fills no position", () => {
        const deletion = runCli("employee", "delete", "omar")

        expect(deletion.exitCode).toBe(0)
        expect(deletion.stdout).toBe('Deleted employee "omar".\n')
        expect(runCli("employee", "show", "omar").exitCode).toBe(1)
    })

    test("fire is an alias of delete", () => {
        expect(runCli("employee", "fire", "omar").exitCode).toBe(0)
        expect(runCli("employee", "list").stdout).toContain("No employees")
    })

    test("delete refuses an employee who fills positions", () => {
        runCli("position", "assign", "developer", "omar")
        runCli("position", "assign", "qa-tester", "omar")

        const deletion = runCli("employee", "delete", "omar")
        const list = runCli("position", "list").stdout

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toContain("default employee of developer, qa")
        expect(deletion.stderr).toContain("--force")
        expect(list).toContain("developer  Developer  omar\n")
        expect(list).toContain("qa-tester  QA Tester  omar\n")
    })

    test.each(["--force", "-f"])(
        "delete %s leaves the employee's positions vacant",
        (flag) => {
            runCli("position", "assign", "developer", "omar")
            runCli("position", "assign", "qa-tester", "omar")

            const deletion = runCli("employee", "delete", "omar", flag)
            const list = runCli("position", "list").stdout

            expect(deletion.exitCode).toBe(0)
            expect(deletion.stdout).toContain("vacant: developer, qa-tester")
            expect(list).toContain("developer  Developer  (vacant)\n")
            expect(list).toContain("qa-tester  QA Tester  (vacant)\n")
        },
    )

    test("delete --force ends its temporary assignments", async () => {
        runCli("position", "assign", "developer", "omar")
        runCli(...interimEmployee, "qa-tester", "omar")
        const before = await loadTemporaryAssignee("qa-tester")

        const deletion = runCli("employee", "delete", "omar", "--force")
        const after = await loadTemporaryAssignee("qa-tester")

        expect(deletion.stdout).toBe(
            'Deleted employee "omar"; now vacant: developer; temporary assignments ended: qa-tester.\n',
        )
        expect(before).toEqual(createEmployeeWorker("omar"))
        expect(after).toBeUndefined()
    })
})
