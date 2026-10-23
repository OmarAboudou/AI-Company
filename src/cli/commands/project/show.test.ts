import { describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli } = useTemporaryProject()

describe("aico project show", () => {
    test("says how to describe a project without description", () => {
        runCli("init", "-n", "Acme")
        runCli("project", "update", "-d", " ")

        const show = runCli("project", "show")

        expect(show.stdout).toContain("aico project update -d <text>")
    })

    test("fails when there is no company", () => {
        expect(runCli("project", "show").exitCode).toBe(1)
    })
})
