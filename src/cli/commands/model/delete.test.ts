import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const { runCli } = useTemporaryProject()

describe("llmco model delete", () => {
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
})
