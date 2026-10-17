import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../cli-test-helpers.ts"

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
        expect(show.stdout).toBe("# Anthropic\n\nmodels: (none)\n")
    })

    test("show lists the provider's models, sorted by id", () => {
        createAnthropic()
        const create = ["model", "create", "anthropic"]
        runCli(...create, "claude-opus-5-5", "-n", "Opus", "-a", "opus")
        runCli(...create, "claude-haiku-4-5", "-n", "Haiku", "-a", "haiku")

        const show = runCli("provider", "show", "anthropic").stdout

        expect(show).toContain("models: claude-haiku-4-5, claude-opus-5-5\n")
    })

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

    test("show fails for an unknown provider", () => {
        const show = runCli("provider", "show", "anthropic")

        expect(show.exitCode).toBe(1)
        expect(show.stderr).toContain('No provider "anthropic".')
    })
})

test("provider commands require a company", () => {
    expect(runCli("provider", "list").exitCode).toBe(1)
})
