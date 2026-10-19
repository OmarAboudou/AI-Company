import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const { runCli } = useTemporaryProject()

describe("llmco provider", () => {
    beforeEach(() => {
        runCli("init", "--name", "Acme")
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

        const second = runCli("provider", "create", "anthropic", "-n", "Other")
        const show = runCli("provider", "show", "anthropic").stdout

        expect(second.exitCode).toBe(1)
        expect(show).toContain("# Anthropic\n")
    })

    test("create rejects an id that is not kebab-case", () => {
        const create = runCli("provider", "create", "Anthropic", "-n", "A")

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain("kebab-case")
    })
})

describe("llmco provider API key", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
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
        const create = runCli(
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

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain("cannot be used with")
        expect(runCli("provider", "list").stdout).toContain("No providers")
    })

    test("create rejects an invalid environment variable name", () => {
        const create = ["provider", "create", "anthropic", "-n", "Anthropic"]

        const result = runCli(...create, "-e", "$ANTHROPIC_API_KEY")

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain("variable's name, without $")
    })
})
