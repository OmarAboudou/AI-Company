import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

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

    test("show fails for a model the provider does not have", () => {
        const show = runCli("model", "show", "anthropic", "claude-opus-5-5")

        expect(show.exitCode).toBe(1)
        expect(show.stderr).toContain('has no model "claude-opus-5-5"')
    })
})
