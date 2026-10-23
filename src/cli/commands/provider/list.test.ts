import { beforeEach, describe, expect, test } from "bun:test"
import { createCompany } from "../../../organization/company/create-company.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico provider", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme" })
    })

    function createAnthropic() {
        return runCli("provider", "create", "anthropic", "-n", "Anthropic")
    }

    test("list aligns names after the ids, sorted by id", () => {
        runCli("provider", "create", "ollama", "-n", "Ollama")
        createAnthropic()

        const list = runCli("provider", "list").stdout

        expect(list).toBe("anthropic  Anthropic\nollama     Ollama\n")
    })

    test("list says so when there is no provider", () => {
        const list = runCli("provider", "list")

        expect(list.exitCode).toBe(0)
        expect(list.stdout).toContain("No providers yet.")
    })
})

test("provider commands require a company", () => {
    expect(runCli("provider", "list").exitCode).toBe(1)
})
