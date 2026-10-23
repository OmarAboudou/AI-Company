import { beforeEach, describe, expect, test } from "bun:test"
import { saveExampleLlmModel } from "../../../llm/model/save-example-llm-model.testing.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createEmployee } from "../../../organization/employee/create-employee.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

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

    test("delete removes an employee who holds no position", () => {
        const deletion = runCli("employee", "delete", "omar")

        expect(deletion.exitCode).toBe(0)
        expect(deletion.stdout).toBe('Deleted employee "omar".\n')
        expect(runCli("employee", "show", "omar").exitCode).toBe(1)
    })

    test("fire is an alias of delete", () => {
        expect(runCli("employee", "fire", "omar").exitCode).toBe(0)
        expect(runCli("employee", "list").stdout).toContain("No employees")
    })

    test("delete refuses an employee who holds positions", () => {
        runCli("position", "assign", "developer", "omar")
        runCli("position", "assign", "qa-tester", "omar")

        const deletion = runCli("employee", "delete", "omar")
        const list = runCli("position", "list").stdout

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toBe(
            'Employee "omar" holds developer, qa-tester. Add --force to delete it anyway and give developer, qa-tester back to the user.\n',
        )
        expect(list).toContain("developer  Developer  omar\n")
        expect(list).toContain("qa-tester  QA Tester  omar\n")
    })

    test.each(["--force", "-f"])(
        "delete %s gives the employee's positions back to the user",
        (flag) => {
            runCli("position", "assign", "developer", "omar")
            runCli("position", "assign", "qa-tester", "omar")

            const deletion = runCli("employee", "delete", "omar", flag)
            const list = runCli("position", "list").stdout

            expect(deletion.exitCode).toBe(0)
            expect(deletion.stdout).toBe(
                'Deleted employee "omar"; back to you: developer, qa-tester.\n',
            )
            expect(list).toContain("developer  Developer  (you)\n")
            expect(list).toContain("qa-tester  QA Tester  (you)\n")
        },
    )
})
