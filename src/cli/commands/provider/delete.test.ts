import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli } = useTemporaryProject()

describe("llmco provider delete", () => {
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
    })

    function createModel(id: string) {
        return runCli("model", "create", "anthropic", id, "-n", id, "-a", id)
    }

    test("delete removes a provider without models", () => {
        const deletion = runCli("provider", "delete", "anthropic")

        expect(deletion.exitCode).toBe(0)
        expect(deletion.stdout).toBe('Deleted provider "anthropic".\n')
        expect(runCli("provider", "list").stdout).toContain("No providers")
    })

    test("delete refuses a provider with models", () => {
        createModel("claude-opus-5-5")
        createModel("claude-haiku-4-5")

        const deletion = runCli("provider", "delete", "anthropic")

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toContain("claude-haiku-4-5, claude-opus-5-5")
        expect(deletion.stderr).toContain("--force")
        expect(runCli("model", "list").stdout).toContain("claude-opus-5-5")
    })

    test.each(["--force", "-f"])(
        "delete %s deletes the provider with its models",
        (flag) => {
            createModel("claude-opus-5-5")

            const deletion = runCli("provider", "delete", "anthropic", flag)

            expect(deletion.exitCode).toBe(0)
            expect(deletion.stdout).toContain("its models claude-opus-5-5")
            expect(runCli("model", "list").stdout).toContain("No models")
        },
    )
})
