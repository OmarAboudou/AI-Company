import { beforeEach, describe, expect, test } from "bun:test"
import { saveExampleLlmModel } from "../../../llm/model/save-example-llm-model.testing.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createEmployee } from "../../../organization/employee/create-employee.ts"
import { assignPosition } from "../../../organization/position/assign-position.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico employee replace", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme" })
        await saveExampleLlmModel(projectRoot)
        await Promise.all([
            ...["developer", "qa-tester", "designer"].map((id) =>
                createPosition(projectRoot, id, { title: id, description: "" }),
            ),
        ])
        await createEmployee(projectRoot, "omar", {
            name: "Omar",
            kind: "llm",
            providerId: "anthropic",
            modelId: "opus",
        })
        await createEmployee(projectRoot, "alice", {
            name: "Alice",
            kind: "llm",
            providerId: "anthropic",
            modelId: "opus",
        })
        await Promise.all([
            assignPosition(projectRoot, "developer", "omar"),
            assignPosition(projectRoot, "qa-tester", "omar"),
            assignPosition(projectRoot, "designer", "alice"),
        ])
    })

    test("replace gives every position of an employee to another", () => {
        const handover = runCli("employee", "replace", "omar", "alice")
        const list = runCli("position", "list").stdout

        expect(handover.stdout).toBe(
            '"alice" replaces "omar" in developer, qa-tester; "omar" stays hired.\n',
        )
        expect(list).toContain("developer  developer  alice\n")
        expect(list).toContain("qa-tester  qa-tester  alice\n")
    })

    test("hand-over is an alias of replace", () => {
        const handover = runCli("employee", "hand-over", "omar", "alice")

        expect(handover.exitCode).toBe(0)
        expect(runCli("position", "list").stdout).not.toContain("omar")
    })

    test("replace says so when the employee holds no position", () => {
        runCli(
            "employee",
            "create",
            "llm",
            "bob",
            "-n",
            "Bob",
            "-p",
            "anthropic",
            "-m",
            "opus",
        )

        const handover = runCli("employee", "replace", "bob", "alice")

        expect(handover.exitCode).toBe(0)
        expect(handover.stdout).toContain("nothing to replace")
    })

    test("replace refuses an employee replacing itself", () => {
        const handover = runCli("employee", "replace", "omar", "omar")

        expect(handover.exitCode).toBe(1)
        expect(handover.stderr).toContain("can't replace itself")
    })
})
