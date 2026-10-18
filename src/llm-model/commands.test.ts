import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../cli-test-helpers.ts"

const { runCli } = useTemporaryProject()

describe("llmco model", () => {
    beforeEach(() => {
        runCli("init", "--name", "Acme", "-D", "founder")
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

    test("list prefixes each model with its provider, sorted", () => {
        runCli("provider", "create", "bedrock", "-n", "Amazon Bedrock")
        runCli(
            "provider",
            "connection",
            "create",
            "bedrock",
            "anthropic-messages",
            "-u",
            "https://bedrock.example.com",
        )
        createOpus("bedrock")
        createOpus()
        const create = ["model", "create", "anthropic", "claude-haiku-4-5"]
        runCli(...create, "-n", "Claude Haiku 4.5", "-a", "claude-haiku-4-5")

        expect(runCli("model", "list").stdout).toBe(
            "anthropic/claude-haiku-4-5  Claude Haiku 4.5\n" +
                "anthropic/claude-opus-5-5   Claude Opus 5.5\n" +
                "bedrock/claude-opus-5-5     Claude Opus 5.5\n",
        )
    })

    test("list says so when there is no model", () => {
        const list = runCli("model", "list")

        expect(list.exitCode).toBe(0)
        expect(list.stdout).toContain("No models yet.")
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

    test("show fails for a model the provider does not have", () => {
        const show = runCli("model", "show", "anthropic", "claude-opus-5-5")

        expect(show.exitCode).toBe(1)
        expect(show.stderr).toContain('has no model "claude-opus-5-5"')
    })
})

describe("llmco model protocol", () => {
    const opus = ["anthropic", "claude-opus-5-5", "-n", "Opus", "-a", "opus"]
    const openRouterUrl = "https://openrouter.ai/api"

    beforeEach(() => {
        runCli("init", "-n", "Acme", "-D", "founder")
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

    test("update -p moves the model to another connection", () => {
        connect("anthropic-messages")
        runCli("model", "create", ...opus)
        connect("openai-responses", `${openRouterUrl}/v1`)
        const model = ["anthropic", "claude-opus-5-5"]
        const before = runCli("model", "show", ...model).stdout

        runCli("model", "update", ...model, "-p", "openai-responses")
        const after = runCli("model", "show", ...model).stdout

        expect(before).toContain("protocol: anthropic-messages\n")
        expect(after).toContain("protocol: openai-responses\n")
    })

    test("update -p refuses a protocol the provider has no connection for", () => {
        connect("anthropic-messages")
        runCli("model", "create", ...opus)

        const model = ["anthropic", "claude-opus-5-5"]
        const update = runCli(
            "model",
            "update",
            ...model,
            "-p",
            "openai-responses",
        )

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain("has no openai-responses connection")
    })
})

describe("llmco model update", () => {
    const opus = ["anthropic", "claude-opus-5-5"]

    beforeEach(() => {
        runCli("init", "-n", "Acme", "-D", "founder")
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
        runCli("model", "create", ...opus, "-n", "Opus", "-a", "claude-opus")
    })

    test("update -a changes the api id and keeps the name", () => {
        const update = runCli("model", "update", ...opus, "-a", "opus-v2")
        const show = runCli("model", "show", ...opus).stdout

        expect(update.stdout).toContain('Updated model "claude-opus-5-5"')
        expect(show).toContain(
            "# Opus\n\nprovider: anthropic\napi id: opus-v2\n",
        )
    })

    test("update -n changes the name and keeps the api id", () => {
        runCli("model", "update", ...opus, "-n", "Claude Opus 5.5")

        const show = runCli("model", "show", ...opus).stdout

        expect(show).toContain("# Claude Opus 5.5\n")
        expect(show).toContain("api id: claude-opus\n")
    })

    test("update validates like create", () => {
        const update = runCli("model", "update", ...opus, "-a", " ")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain("at apiId")
    })

    test("update requires at least one option", () => {
        const update = runCli("model", "update", ...opus)

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain("Nothing to update")
    })
})

describe("llmco model update-id", () => {
    const opus = ["anthropic", "claude-opus-5-5"]

    beforeEach(() => {
        runCli("init", "-n", "Acme", "-D", "founder")
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
        runCli("model", "create", ...opus, "-n", "Opus", "-a", "opus")
        runCli("model", "create", "anthropic", "haiku", "-n", "H", "-a", "h")
    })

    test("update-id moves the model to its new id", () => {
        const update = runCli("model", "update-id", ...opus, "opus")
        const show = runCli("model", "show", "anthropic", "opus").stdout

        expect(update.stdout).toContain('is now "opus".\n')
        expect(show).toStartWith("# Opus\n")
        expect(runCli("model", "show", ...opus).exitCode).toBe(1)
    })

    test("update-id rewrites the employees running on it", () => {
        const hire = ["employee", "create", "llm", "claude", "-n", "Claude"]
        runCli(...hire, "-p", "anthropic", "-m", "claude-opus-5-5")

        const update = runCli("model", "update-id", ...opus, "opus")
        const list = runCli("employee", "list").stdout

        expect(update.stdout).toContain("updated employees: claude.")
        expect(list).toContain("anthropic/opus")
    })

    test("update-id refuses an id the provider already has", () => {
        const update = runCli("model", "update-id", ...opus, "haiku")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain('already has a model "haiku".')
        expect(runCli("model", "show", ...opus).exitCode).toBe(0)
    })

    test("update-id fails for a model the provider does not have", () => {
        const update = runCli("model", "update-id", "anthropic", "gpt", "g")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain('has no model "gpt"')
    })
})

describe("llmco model delete", () => {
    const opus = ["anthropic", "claude-opus-5-5"]

    beforeEach(() => {
        runCli("init", "-n", "Acme", "-D", "founder")
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
        runCli("model", "create", ...opus, "-n", "Opus", "-a", "opus")
    })

    test("delete removes a model no employee runs on", () => {
        const deletion = runCli("model", "delete", ...opus)

        expect(deletion.exitCode).toBe(0)
        expect(runCli("model", "list").stdout).toContain("No models yet.")
    })

    test("delete refuses a model an employee runs on", () => {
        const hire = ["employee", "create", "llm", "claude", "-n", "Claude"]
        runCli(...hire, "-p", "anthropic", "-m", "claude-opus-5-5")

        const deletion = runCli("model", "delete", ...opus)

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toContain("is used by claude.")
        expect(deletion.stderr).toContain("llmco employee update")
        expect(runCli("model", "show", ...opus).exitCode).toBe(0)
    })

    test("delete has no --force: it would leave employees without a model", () => {
        const deletion = runCli("model", "delete", ...opus, "--force")

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toContain("unknown option '--force'")
    })

    test("delete fails for a model the provider does not have", () => {
        const deletion = runCli("model", "delete", "anthropic", "gpt-5")

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toContain('has no model "gpt-5"')
    })
})

test("model commands require a company", () => {
    expect(runCli("model", "list").exitCode).toBe(1)
})
