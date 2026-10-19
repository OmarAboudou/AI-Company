import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const { runCli } = useTemporaryProject()

describe("llmco model", () => {
    beforeEach(() => {
        runCli("init", "--name", "Acme")
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
    })

    function createOpus(providerId = "anthropic") {
        return runCli(
            "model",
            "create",
            providerId,
            "claude-opus-5-5",
            "--name",
            "Claude Opus 5.5",
            "--api-id",
            "claude-opus-5-5",
        )
    }

    test("create then show displays the provider, api id and protocol", () => {
        expect(createOpus().exitCode).toBe(0)

        const show = runCli("model", "show", "anthropic", "claude-opus-5-5")
        expect(show.exitCode).toBe(0)
        expect(show.stdout).toBe(
            "# Claude Opus 5.5\n\nprovider: anthropic\napi id: claude-opus-5-5\nprotocol: anthropic-messages\n",
        )
    })

    test("create keeps the api id in the provider's own format", () => {
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
        const create = ["model", "create", "ollama", "llama-3-1-8b"]

        runCli(...create, "-n", "Llama 3.1 8B", "-a", "llama3.1:8b")

        const show = runCli("model", "show", "ollama", "llama-3-1-8b").stdout
        expect(show).toContain("api id: llama3.1:8b")
    })

    test("create requires an existing provider", () => {
        const create = createOpus("bedrock")

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain('No provider "bedrock".')
    })

    test("create refuses an id the provider already has", () => {
        createOpus()

        const second = createOpus()

        expect(second.exitCode).toBe(1)
        expect(second.stderr).toContain("already has a model")
    })

    test("create requires an api id", () => {
        const create = ["model", "create", "anthropic", "claude-opus-5-5"]

        const withoutApiId = runCli(...create, "-n", "Claude Opus 5.5")

        expect(withoutApiId.exitCode).toBe(1)
        expect(withoutApiId.stderr).toContain("--api-id")
    })

    test("create rejects a model id that is not kebab-case", () => {
        const create = ["model", "create", "anthropic", "claude.opus"]

        const result = runCli(...create, "-n", "Opus", "-a", "claude-opus-5-5")

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain("kebab-case")
    })
})

describe("llmco model protocol", () => {
    const opus = ["anthropic", "claude-opus-5-5", "-n", "Opus", "-a", "opus"]
    const openRouterUrl = "https://openrouter.ai/api"

    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("provider", "create", "anthropic", "-n", "Anthropic")
    })

    function connect(protocol: string, url = openRouterUrl) {
        runCli(
            "provider",
            "connection",
            "create",
            "anthropic",
            protocol,
            "-u",
            url,
        )
    }

    test("create refuses a provider without connection", () => {
        const create = runCli("model", "create", ...opus)

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain('"anthropic" has no connection yet')
        expect(create.stderr).toContain("`llmco provider connection create`")
    })

    test("create requires --protocol when the provider has several", () => {
        connect("anthropic-messages")
        connect("openai-chat-completions", `${openRouterUrl}/v1`)

        const create = runCli("model", "create", ...opus)

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain("choose one with --protocol")
    })

    test.each(["--protocol", "-p"])("create %s picks the protocol", (flag) => {
        connect("anthropic-messages")
        connect("openai-chat-completions", `${openRouterUrl}/v1`)

        runCli("model", "create", ...opus, flag, "openai-chat-completions")
        const show = runCli("model", "show", "anthropic", "claude-opus-5-5")

        expect(show.stdout).toContain("protocol: openai-chat-completions\n")
    })

    test("create refuses a protocol the provider has no connection for", () => {
        connect("anthropic-messages")

        const create = runCli(
            "model",
            "create",
            ...opus,
            "-p",
            "openai-responses",
        )

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain("has no openai-responses connection")
    })
})
