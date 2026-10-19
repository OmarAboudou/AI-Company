import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../../use-temporary-project.ts"

const { runCli } = useTemporaryProject()

const anthropicUrl = "https://api.anthropic.com"

beforeEach(() => {
    runCli("init", "-n", "Acme")
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
})
