import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const { runCli, getProjectPath } = useTemporaryProject()

const interimEmployee = ["position", "interim", "employee"]

async function temporaryAssignee(positionId: string): Promise<unknown> {
    const path = [".llmco", ".state", "positions", `${positionId}.json`]
    const file = Bun.file(getProjectPath(...path))
    return (await file.exists())
        ? (await file.json()).temporaryAssignment
        : undefined
}

function employeeWorker(employeeId: string) {
    return { kind: "employee", employeeId }
}

describe("llmco employee delete", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("employee", "create", "human", "omar", "-n", "Omar")
        runCli("position", "create", "developer", "-t", "Developer")
        runCli("position", "create", "qa-tester", "-t", "QA Tester")
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
        const before = await temporaryAssignee("qa-tester")

        const deletion = runCli("employee", "delete", "omar", "--force")
        const after = await temporaryAssignee("qa-tester")

        expect(deletion.stdout).toBe(
            'Deleted employee "omar"; now vacant: developer; temporary assignments ended: qa-tester.\n',
        )
        expect(before).toEqual(employeeWorker("omar"))
        expect(after).toBeUndefined()
    })
})
