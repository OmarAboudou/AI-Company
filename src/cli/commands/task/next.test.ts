import { beforeEach, describe, expect, test } from "bun:test"
import { createCompany } from "../../../organization/company/create-company.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico task next", () => {
    beforeEach(async () => {
        await createCompany(getProjectPath(), { name: "Acme" })
    })

    test("says when no task waits", () => {
        const next = runCli("task", "next")

        expect(next.exitCode).toBe(0)
        expect(next.stdout).toBe("No task waits for you.\n")
    })
})
