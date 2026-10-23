import { beforeEach, describe, expect, test } from "bun:test"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createEmployee } from "../../../organization/employee/create-employee.ts"
import { assignPosition } from "../../../organization/position/assign-position.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCliWithEnv, getProjectPath } = useTemporaryProject()

const julieEnv = { AICO_CURRENT_HUMAN_ID: "julie" }

describe("aico task next", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
        await createEmployee(projectRoot, "julie", {
            name: "Julie",
            kind: "human",
        })
        await createPosition(projectRoot, "qa-tester", {
            title: "QA",
            description: "",
        })
        await assignPosition(projectRoot, "qa-tester", "julie")
    })

    test("says when no task waits", () => {
        const next = runCliWithEnv(julieEnv, "task", "next")

        expect(next.exitCode).toBe(0)
        expect(next.stdout).toBe("No task waits for you.\n")
    })
})
