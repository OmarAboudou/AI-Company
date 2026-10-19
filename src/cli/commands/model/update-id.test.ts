import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const { runCli } = useTemporaryProject()

describe("llmco model update-id", () => {
    const opus = ["anthropic", "claude-opus-5-5"]

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
