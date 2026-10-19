import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const { runCli } = useTemporaryProject()

describe("llmco provider update-id", () => {
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
        runCli("model", "create", "anthropic", "opus", "-n", "Opus", "-a", "o")
    })

    test("update-id moves the provider with its models", () => {
        const update = runCli("provider", "update-id", "anthropic", "claude")
        const models = runCli("model", "list").stdout

        expect(update.stdout).toBe('Provider "anthropic" is now "claude".\n')
        expect(models).toBe("claude/opus  Opus\n")
        expect(runCli("provider", "show", "anthropic").exitCode).toBe(1)
    })

    test("update-id rewrites the employees running on it", () => {
        const hire = ["employee", "create", "llm", "claude", "-n", "Claude"]
        runCli(...hire, "-p", "anthropic", "-m", "opus")

        const update = runCli("provider", "update-id", "anthropic", "claude")
        const show = runCli("employee", "show", "claude").stdout

        expect(update.stdout).toContain("updated employees: claude.")
        expect(show).toContain("provider: claude\nmodel: opus\n")
    })

    test("update-id refuses an id another provider has", () => {
        const update = runCli("provider", "update-id", "anthropic", "ollama")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain('Provider "ollama" already exists.')
        expect(runCli("model", "list").stdout).toContain("anthropic/opus")
    })
})
