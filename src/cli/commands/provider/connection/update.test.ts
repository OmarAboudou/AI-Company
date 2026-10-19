import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../../use-temporary-project.ts"

const { runCli } = useTemporaryProject()

beforeEach(() => {
    runCli("init", "-n", "Acme")
    runCli("provider", "create", "anthropic", "-n", "Anthropic")
    runCli("provider", "create", "openrouter", "-n", "OpenRouter")
})

function createConnection(...args: string[]) {
    return runCli("provider", "connection", "create", ...args)
}

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
