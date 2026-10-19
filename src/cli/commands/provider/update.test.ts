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
})
