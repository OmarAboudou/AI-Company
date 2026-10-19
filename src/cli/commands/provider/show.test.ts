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

    test("show lists the provider's models, sorted by id", () => {
        createAnthropic()
        runCli(
            "provider",
            "connection",
            "create",
            "anthropic",
            "anthropic-messages",
            "-u",
            "https://api.anthropic.com",
        )
        const create = ["model", "create", "anthropic"]
        runCli(...create, "claude-opus-5-5", "-n", "Opus", "-a", "opus")
        runCli(...create, "claude-haiku-4-5", "-n", "Haiku", "-a", "haiku")

        const show = runCli("provider", "show", "anthropic").stdout

        expect(show).toContain("models: claude-haiku-4-5, claude-opus-5-5\n")
    })

    test("show fails for an unknown provider", () => {
        const show = runCli("provider", "show", "anthropic")

        expect(show.exitCode).toBe(1)
        expect(show.stderr).toContain('No provider "anthropic".')
    })
})

describe("llmco provider connection create", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("provider", "create", "anthropic", "-n", "Anthropic")
        runCli("provider", "create", "openrouter", "-n", "OpenRouter")
    })

    function createConnection(...args: string[]) {
        return runCli("provider", "connection", "create", ...args)
    }

    test("provider show lists the provider's connections", () => {
        const url = "https://openrouter.ai/api"
        createConnection("openrouter", "openai-chat-completions", "-u", url)
        createConnection("openrouter", "anthropic-messages", "-u", url)

        const show = runCli("provider", "show", "openrouter").stdout

        expect(show).toContain(
            "connections: anthropic-messages, openai-chat-completions\n",
        )
    })
})
