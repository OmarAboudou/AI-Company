import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../cli-test-helpers.ts"

const { runCli } = useTemporaryProject()

const anthropicUrl = "https://api.anthropic.com"

beforeEach(() => {
    runCli("init", "-n", "Acme", "-D", "founder")
    runCli("provider", "create", "anthropic", "-n", "Anthropic")
    runCli("provider", "create", "openrouter", "-n", "OpenRouter")
})

function createConnection(...args: string[]) {
    return runCli("provider", "connection", "create", ...args)
}

describe("llmco provider connection create", () => {
    test("create then list shows the URL and how the key is sent", () => {
        const create = createConnection(
            "anthropic",
            "anthropic-messages",
            "-u",
            anthropicUrl,
        )
        const list = runCli("provider", "connection", "list").stdout

        expect(create.stdout).toBe(
            'Created the anthropic-messages connection of provider "anthropic".\n',
        )
        expect(list).toBe(
            `anthropic/anthropic-messages  ${anthropicUrl}  x-api-key\n`,
        )
    })

    test("--auth bearer sends the key as a bearer token", () => {
        const url = "https://openrouter.ai/api"
        createConnection(
            "openrouter",
            "anthropic-messages",
            "-u",
            url,
            "--auth",
            "bearer",
        )

        const list = runCli("provider", "connection", "list").stdout

        expect(list).toBe(`openrouter/anthropic-messages  ${url}  bearer\n`)
    })

    test("list sorts by provider, then by protocol", () => {
        const url = "https://openrouter.ai/api/v1"
        createConnection("openrouter", "openai-responses", "-u", url)
        createConnection("openrouter", "openai-chat-completions", "-u", url)
        createConnection("anthropic", "anthropic-messages", "-u", anthropicUrl)

        const list = runCli("provider", "connection", "list").stdout
        const names = list
            .trimEnd()
            .split("\n")
            .map((row) => row.split(" ")[0])

        expect(names).toEqual([
            "anthropic/anthropic-messages",
            "openrouter/openai-chat-completions",
            "openrouter/openai-responses",
        ])
    })

    test("list says so when there is no connection", () => {
        const list = runCli("provider", "connection", "list")

        expect(list.exitCode).toBe(0)
        expect(list.stdout).toContain("No connections yet.")
    })

    test("provider show lists the provider's connections", () => {
        const url = "https://openrouter.ai/api"
        createConnection("openrouter", "openai-chat-completions", "-u", url)
        createConnection("openrouter", "anthropic-messages", "-u", url)

        const show = runCli("provider", "show", "openrouter").stdout

        expect(show).toContain(
            "connections: anthropic-messages, openai-chat-completions\n",
        )
    })

    test("create refuses a protocol the provider already has", () => {
        createConnection("anthropic", "anthropic-messages", "-u", anthropicUrl)

        const second = createConnection(
            "anthropic",
            "anthropic-messages",
            "-u",
            "https://example.com",
        )
        const list = runCli("provider", "connection", "list").stdout

        expect(second.exitCode).toBe(1)
        expect(second.stderr).toContain(
            "already has a connection through anthropic",
        )
        expect(list).toContain(anthropicUrl)
    })

    test("create refuses an unknown protocol", () => {
        const create = createConnection(
            "anthropic",
            "gemini",
            "-u",
            anthropicUrl,
        )

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain("anthropic-messages")
    })

    test("create refuses a base URL that isn't http or https", () => {
        const create = createConnection(
            "anthropic",
            "anthropic-messages",
            "-u",
            "localhost:11434",
        )

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain("Invalid URL")
    })

    test("create refuses --auth on an OpenAI protocol", () => {
        const create = createConnection(
            "openrouter",
            "openai-chat-completions",
            "-u",
            "https://openrouter.ai/api/v1",
            "-a",
            "bearer",
        )

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain("only applies to anthropic-messages")
    })

    test("create fails for an unknown provider", () => {
        const create = createConnection(
            "ollama",
            "anthropic-messages",
            "-u",
            "http://localhost:11434",
        )

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain('No provider "ollama".')
    })
})

describe("llmco provider connection update", () => {
    beforeEach(() => {
        createConnection(
            "openrouter",
            "anthropic-messages",
            "-u",
            "https://openrouter.ai/api",
            "-a",
            "bearer",
        )
    })

    test("update -u changes the URL and keeps the auth", () => {
        const url = "https://eu.openrouter.ai/api"
        const update = runCli(
            "provider",
            "connection",
            "update",
            "openrouter",
            "anthropic-messages",
            "-u",
            url,
        )
        const list = runCli("provider", "connection", "list").stdout

        expect(update.stdout).toBe(
            'Updated the anthropic-messages connection of provider "openrouter".\n',
        )
        expect(list).toBe(`openrouter/anthropic-messages  ${url}  bearer\n`)
    })

    test("update requires at least one option", () => {
        const update = runCli(
            "provider",
            "connection",
            "update",
            "openrouter",
            "anthropic-messages",
        )

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain("Nothing to update")
    })

    test("update fails for a connection the provider doesn't have", () => {
        const update = runCli(
            "provider",
            "connection",
            "update",
            "openrouter",
            "openai-responses",
            "-u",
            "https://openrouter.ai/api/v1",
        )

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain("has no openai-responses connection")
    })
})

describe("llmco provider connection delete", () => {
    test("delete removes only that connection", () => {
        const url = "https://openrouter.ai/api"
        createConnection("openrouter", "anthropic-messages", "-u", url)
        createConnection("openrouter", "openai-responses", "-u", `${url}/v1`)
        const before = runCli("provider", "show", "openrouter").stdout

        const deletion = runCli(
            "provider",
            "connection",
            "delete",
            "openrouter",
            "openai-responses",
        )
        const after = runCli("provider", "show", "openrouter").stdout

        expect(before).toContain("connections: anthropic-messages, openai")
        expect(deletion.stdout).toBe(
            'Deleted the openai-responses connection of provider "openrouter".\n',
        )
        expect(after).toContain("connections: anthropic-messages\n")
    })

    test("delete refuses a connection a model is called with", () => {
        createConnection("anthropic", "anthropic-messages", "-u", anthropicUrl)
        const opus = [
            "anthropic",
            "claude-opus-5-5",
            "-n",
            "Opus",
            "-a",
            "opus",
        ]
        runCli("model", "create", ...opus)

        const deletion = runCli(
            "provider",
            "connection",
            "delete",
            "anthropic",
            "anthropic-messages",
        )

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toContain("is used by models claude-opus-5-5")
        expect(runCli("provider", "connection", "list").stdout).toContain(
            anthropicUrl,
        )
    })

    test("delete fails for a connection the provider doesn't have", () => {
        const deletion = runCli(
            "provider",
            "connection",
            "delete",
            "anthropic",
            "anthropic-messages",
        )

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toContain("has no anthropic-messages")
    })
})
