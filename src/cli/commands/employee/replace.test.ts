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
        const replace = runCli("employee", "replace", "omar", "alice")
        const list = runCli("position", "list").stdout

        expect(replace.stdout).toContain("employee of developer, qa-tester;")
        expect(replace.stdout).toContain('"omar" stays hired.')
        expect(list).toContain("developer  developer  alice\n")
        expect(list).toContain("qa-tester  qa-tester  alice\n")
    })

    test("hand-over is an alias of replace", () => {
        const handOver = runCli("employee", "hand-over", "omar", "alice")

        expect(handOver.exitCode).toBe(0)
        expect(runCli("position", "list").stdout).not.toContain("omar")
    })

    test("replace says so when the employee fills no position", () => {
        runCli("employee", "create", "human", "bob", "-n", "Bob")

        const replace = runCli("employee", "replace", "bob", "alice")

        expect(replace.exitCode).toBe(0)
        expect(replace.stdout).toContain("nothing to replace")
    })

    test("replace keeps the employee's temporary assignments, and says so", async () => {
        runCli("position", "create", "support", "-t", "Support")
        runCli(...interimEmployee, "support", "omar")

        const replace = runCli("employee", "replace", "omar", "alice")

        expect(replace.stdout).toEndWith(
            '"omar" stays assigned temporarily to support.\n',
        )
        const after = await temporaryAssignee("support")
        expect(after).toEqual(employeeWorker("omar"))
    })

    test("replace ends the replacement's temporary assignment of a position it now fills", async () => {
        runCli(...interimEmployee, "developer", "alice")
        const before = await temporaryAssignee("developer")

        const replace = runCli("employee", "replace", "omar", "alice")
        const after = await temporaryAssignee("developer")

        expect(before).toEqual(employeeWorker("alice"))
        expect(replace.stdout).toContain(
            "Temporary assignments ended: developer.",
        )
        expect(after).toBeUndefined()
    })

    test.each(["--temporary", "-t"])(
        "replace %s hands over its temporary assignments too",
        async (flag) => {
            runCli("position", "create", "support", "-t", "Support")
            runCli(...interimEmployee, "support", "omar")

            const replace = runCli("employee", "replace", "omar", "alice", flag)
            const after = await temporaryAssignee("support")

            expect(replace.stdout).toBe(
                '"alice" replaces "omar" as default employee of developer, qa-tester and as temporary assignee of support; "omar" stays hired.\n',
            )
            expect(after).toEqual(employeeWorker("alice"))
        },
    )

    test("replace refuses an employee replacing itself", () => {
        const replace = runCli("employee", "replace", "omar", "omar")

        expect(replace.exitCode).toBe(1)
        expect(replace.stderr).toContain("can't replace itself")
    })
})
