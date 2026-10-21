import { beforeEach, describe, expect, test } from "bun:test"
import { createCompany } from "../../../organization/company/create-company.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("llmco provider", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
    })

    function createAnthropic() {
        return runCli("provider", "create", "anthropic", "-n", "Anthropic")
    }

    test("create then show displays the name", () => {
        expect(createAnthropic().exitCode).toBe(0)

        const show = runCli("provider", "show", "anthropic")
        expect(show.exitCode).toBe(0)
        expect(show.stdout).toBe(
            "# Anthropic\n\napi key: (none)\nconnections: (none)\nmodels: (none)\n",
        )
    })

    test("create refuses an existing id", () => {
        createAnthropic()

        const duplicate = runCli(
            "provider",
            "create",
            "anthropic",
            "-n",
            "Other",
        )
        const show = runCli("provider", "show", "anthropic").stdout

        expect(duplicate.exitCode).toBe(1)
        expect(show).toContain("# Anthropic\n")
    })
})

describe("llmco provider API key", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
    })

    test.each([
        ["--api-key-env", "ANTHROPIC_API_KEY", "environment variable"],
        ["-e", "ANTHROPIC_API_KEY", "environment variable"],
        ["--api-key-file", "~/.keys/anthropic", "file"],
        ["-k", "~/.keys/anthropic", "file"],
    ])("create %s %s then show names its source", (flag, value, kind) => {
        const create = ["provider", "create", "anthropic", "-n", "Anthropic"]
        expect(runCli(...create, flag, value).exitCode).toBe(0)

        const show = runCli("provider", "show", "anthropic").stdout

        expect(show).toContain(`api key: ${kind} ${value}\n`)
    })

    test("create refuses an environment variable and a file at once", () => {
        const creation = runCli(
            "provider",
            "create",
            "anthropic",
            "-n",
            "Anthropic",
            "-e",
            "ANTHROPIC_API_KEY",
            "-k",
            "~/.keys/anthropic",
        )

        expect(creation.exitCode).toBe(1)
        expect(creation.stderr).toContain("cannot be used with")
        expect(runCli("provider", "list").stdout).toContain("No providers")
    })
})
