import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../../use-temporary-project.ts"

const { runCli } = useTemporaryProject()

describe("llmco employee", () => {
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
        runCli(
            "model",
            "create",
            "anthropic",
            "claude-opus-5-5",
            "-n",
            "Claude Opus 5.5",
            "-a",
            "claude-opus-5-5",
        )
    })

    test("hire is an alias of create", () => {
        const hire = runCli("employee", "hire", "human", "omar", "-n", "Omar")
        expect(hire.exitCode).toBe(0)

        expect(runCli("employee", "show", "omar").stdout).toBe(
            "# Omar\n\nkind: human\npositions: (none)\n",
        )
    })

    test("create requires the kind before the id", () => {
        const create = runCli("employee", "create", "omar", "-n", "Omar")

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain("unknown command 'omar'")
    })
})
