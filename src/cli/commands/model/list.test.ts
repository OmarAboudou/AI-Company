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
})

test("model commands require a company", () => {
    expect(runCli("model", "list").exitCode).toBe(1)
})
