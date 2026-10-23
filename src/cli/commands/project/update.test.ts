import { beforeEach, describe, expect, test } from "bun:test"
import { createCompany } from "../../../organization/company/create-company.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico project update", () => {
    beforeEach(async () => {
        await createCompany(getProjectPath(), { name: "Acme", description: "" })
    })

    test("update -d replaces the description, which show displays", () => {
        const update = runCli("project", "update", "-d", "A to-do app.")
        const show = runCli("project", "show").stdout

        expect(update.stdout).toBe("Updated the project.\n")
        expect(show).toBe("A to-do app.\n")
    })

    test("update -F reads the new description from a file", async () => {
        await Bun.write(getProjectPath("project.md"), "From a file.")

        runCli("project", "update", "-F", "project.md")

        expect(runCli("project", "show").stdout).toBe("From a file.\n")
    })

    test("update requires at least one option", () => {
        const update = runCli("project", "update")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain("Nothing to update")
    })
})
