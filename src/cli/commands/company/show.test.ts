import { describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("llmco company show", () => {
    test("fails when there is no company", () => {
        expect(runCli("company", "show").exitCode).toBe(1)
    })
})

describe("corrupted files", () => {
    test("company show names the invalid file and field", async () => {
        runCli("init", "--name", "Acme")
        await Bun.write(
            getProjectPath(".llmco", "company", "config.json"),
            '{ "name": "" }',
        )

        const show = runCli("company", "show")

        expect(show.exitCode).toBe(1)
        expect(show.stderr).toStartWith("Invalid .llmco/company/config.json:")
        expect(show.stderr).toContain("at name")
    })
})
