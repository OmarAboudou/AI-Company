import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const { runCli } = useTemporaryProject()

describe("llmco provider API key", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
    })

    test("update -e replaces a file with an environment variable", () => {
        const create = ["provider", "create", "anthropic", "-n", "Anthropic"]
        runCli(...create, "-k", "~/.keys/anthropic")
        const before = runCli("provider", "show", "anthropic").stdout

        runCli("provider", "update", "anthropic", "-e", "ANTHROPIC_API_KEY")
        const after = runCli("provider", "show", "anthropic").stdout

        expect(before).toContain("api key: file ~/.keys/anthropic\n")
        expect(after).toContain("api key: environment variable ANTHROPIC")
    })

    test("update -n keeps the API key's source", () => {
        const create = ["provider", "create", "anthropic", "-n", "Anthropic"]
        runCli(...create, "-e", "ANTHROPIC_API_KEY")

        runCli("provider", "update", "anthropic", "-n", "Anthropic PBC")
        const show = runCli("provider", "show", "anthropic").stdout

        expect(show).toContain("# Anthropic PBC\n")
        expect(show).toContain("api key: environment variable ANTHROPIC")
    })
})

describe("llmco provider update", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("provider", "create", "anthropic", "-n", "Anthropic")
    })

    test("update -n changes the name", () => {
        const update = runCli("provider", "update", "anthropic", "-n", "A.")
        const list = runCli("provider", "list").stdout

        expect(update.stdout).toBe('Updated provider "anthropic".\n')
        expect(list).toBe("anthropic  A.\n")
    })

    test("update requires at least one option", () => {
        const update = runCli("provider", "update", "anthropic")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain("Nothing to update")
    })

    test("update fails for an unknown provider", () => {
        const update = runCli("provider", "update", "ollama", "-n", "Ollama")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain('No provider "ollama".')
    })
})
