import { beforeEach, describe, expect, test } from "bun:test"
import { createCompany } from "../../../organization/company/create-company.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico company update", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme" })
    })

    test("update -n changes the name", () => {
        const update = runCli("company", "update", "-n", "Acme Inc.")
        const show = runCli("company", "show").stdout

        expect(update.stdout).toBe('Updated company "Acme Inc.".\n')
        expect(show).toBe("# Acme Inc.\n")
    })

    test("update requires at least one option", () => {
        const update = runCli("company", "update")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain("Nothing to update")
    })
})
