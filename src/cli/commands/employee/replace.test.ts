import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

const interimEmployee = ["position", "interim", "employee"]

async function loadTemporaryAssignee(positionId: string): Promise<unknown> {
    const pathSegments = [".llmco", ".state", "positions", `${positionId}.json`]
    const stateFile = Bun.file(getProjectPath(...pathSegments))
    return (await stateFile.exists())
        ? (await stateFile.json()).temporaryAssignment
        : undefined
}

function createEmployeeWorker(employeeId: string) {
    return { kind: "employee", employeeId }
}

describe("llmco employee replace", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("employee", "create", "human", "omar", "-n", "Omar")
        runCli("employee", "create", "human", "alice", "-n", "Alice")
        for (const id of ["developer", "qa-tester", "designer"]) {
            runCli("position", "create", id, "-t", id)
        }
        runCli("position", "assign", "developer", "omar")
        runCli("position", "assign", "qa-tester", "omar")
        runCli("position", "assign", "designer", "alice")
    })

    test("replace gives every position of an employee to another", () => {
        const handover = runCli("employee", "replace", "omar", "alice")
        const list = runCli("position", "list").stdout

        expect(handover.stdout).toContain("employee of developer, qa-tester;")
        expect(handover.stdout).toContain('"omar" stays hired.')
        expect(list).toContain("developer  developer  alice\n")
        expect(list).toContain("qa-tester  qa-tester  alice\n")
    })

    test("hand-over is an alias of replace", () => {
        const handover = runCli("employee", "hand-over", "omar", "alice")

        expect(handover.exitCode).toBe(0)
        expect(runCli("position", "list").stdout).not.toContain("omar")
    })

    test("replace says so when the employee fills no position", () => {
        runCli("employee", "create", "human", "bob", "-n", "Bob")

        const handover = runCli("employee", "replace", "bob", "alice")

        expect(handover.exitCode).toBe(0)
        expect(handover.stdout).toContain("nothing to replace")
    })

    test("replace keeps the employee's temporary assignments, and says so", async () => {
        runCli("position", "create", "support", "-t", "Support")
        runCli(...interimEmployee, "support", "omar")

        const handover = runCli("employee", "replace", "omar", "alice")

        expect(handover.stdout).toEndWith(
            '"omar" stays assigned temporarily to support.\n',
        )
        const after = await loadTemporaryAssignee("support")
        expect(after).toEqual(createEmployeeWorker("omar"))
    })

    test("replace ends the replacement's temporary assignment of a position it now fills", async () => {
        runCli(...interimEmployee, "developer", "alice")
        const before = await loadTemporaryAssignee("developer")

        const handover = runCli("employee", "replace", "omar", "alice")
        const after = await loadTemporaryAssignee("developer")

        expect(before).toEqual(createEmployeeWorker("alice"))
        expect(handover.stdout).toContain(
            "Temporary assignments ended: developer.",
        )
        expect(after).toBeUndefined()
    })

    test.each(["--temporary", "-t"])(
        "replace %s hands over its temporary assignments too",
        async (flag) => {
            runCli("position", "create", "support", "-t", "Support")
            runCli(...interimEmployee, "support", "omar")

            const handover = runCli(
                "employee",
                "replace",
                "omar",
                "alice",
                flag,
            )
            const after = await loadTemporaryAssignee("support")

            expect(handover.stdout).toBe(
                '"alice" replaces "omar" as default employee of developer, qa-tester and as temporary assignee of support; "omar" stays hired.\n',
            )
            expect(after).toEqual(createEmployeeWorker("alice"))
        },
    )

    test("replace refuses an employee replacing itself", () => {
        const handover = runCli("employee", "replace", "omar", "omar")

        expect(handover.exitCode).toBe(1)
        expect(handover.stderr).toContain("can't replace itself")
    })
})
