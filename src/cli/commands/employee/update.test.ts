import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const { runCli } = useTemporaryProject()

describe("llmco employee update", () => {
    function createModel(provider: string, model: string) {
        runCli("model", "create", provider, model, "-n", model, "-a", model)
    }

    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("provider", "create", "anthropic", "-n", "Anthropic")
        runCli(
            "provider",
            "connection",
            "create",
            "anthropic",
            "anthropic-messages",
            "-u",
            "https://api.anthropic.com",
        )
        runCli("provider", "create", "ollama", "-n", "Ollama")
        runCli(
            "provider",
            "connection",
            "create",
            "ollama",
            "anthropic-messages",
            "-u",
            "http://localhost:11434",
        )
        createModel("anthropic", "claude-opus-5-5")
        createModel("anthropic", "claude-haiku-4-5")
        createModel("ollama", "llama-3-1-8b")
        const hire = ["employee", "create", "llm", "claude", "-n", "Claude"]
        runCli(...hire, "-p", "anthropic", "-m", "claude-opus-5-5")
        runCli("employee", "create", "human", "omar", "-n", "Omar")
    })

    test("update -n renames an LLM employee and keeps its model", () => {
        const update = runCli("employee", "update", "claude", "-n", "Claude 2")
        const show = runCli("employee", "show", "claude").stdout

        expect(update.stdout).toBe('Updated employee "claude".\n')
        expect(show).toStartWith("# Claude 2\n")
        expect(show).toContain("model: claude-opus-5-5\n")
    })

    test("update -p and -m move it to another provider", () => {
        const update = ["employee", "update", "claude"]

        runCli(...update, "-p", "ollama", "-m", "llama-3-1-8b")

        const list = runCli("employee", "list").stdout
        expect(list).toContain("ollama/llama-3-1-8b")
    })

    test("update requires at least one option", () => {
        const update = runCli("employee", "update", "claude")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain("Nothing to update")
    })
})
