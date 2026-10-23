import { beforeEach, describe, expect, test } from "bun:test"
import { createCompany } from "../../../organization/company/create-company.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico company update", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, {
            name: "Acme",
            description: "We build things.",
        })
    })

    test("update -n changes the name and keeps the description", () => {
        const update = runCli("company", "update", "-n", "Acme Inc.")
        const show = runCli("company", "show").stdout

        expect(update.stdout).toBe('Updated company "Acme Inc.".\n')
        expect(show).toBe("# Acme Inc.\n\nWe build things.\n")
    })

    test("update -d changes the description and keeps the name", () => {
        runCli("company", "update", "-d", "We build better things.")

        const show = runCli("company", "show").stdout

        expect(show).toBe("# Acme\n\nWe build better things.\n")
    })

    test("update -F reads the new description from a file", async () => {
        await Bun.write(getProjectPath("company.md"), "From a file.")

        runCli("company", "update", "-F", "company.md")

        const show = runCli("company", "show").stdout
        expect(show).toBe("# Acme\n\nFrom a file.\n")
    })

    test("update requires at least one option", () => {
        const update = runCli("company", "update")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain("Nothing to update")
    })
})
