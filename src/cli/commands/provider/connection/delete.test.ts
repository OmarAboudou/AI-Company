import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../../use-temporary-project.testing.ts"

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
})
