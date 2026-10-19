import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.ts"

type History = {
    createdAt: string
    formerIds?: { id: string; until: string }[]
}

const { runCli, projectPath } = useTemporaryProject()

describe("llmco employee update", () => {
    function createModel(provider: string, model: string) {
        runCli("model", "create", provider, model, "-n", model, "-a", model)
    }

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
        runCli("provider", "create", "ollama", "-n", "Ollama")
        runCli(
            "provider",
            "connection",
            "create",
            "ollama",
            "anthropic-messages",
            "-u",
            "http://localhost:11434",
        )
        createModel("anthropic", "claude-opus-5-5")
        createModel("anthropic", "claude-haiku-4-5")
        createModel("ollama", "llama-3-1-8b")
        const hire = ["employee", "create", "llm", "claude", "-n", "Claude"]
        runCli(...hire, "-p", "anthropic", "-m", "claude-opus-5-5")
        runCli("employee", "create", "human", "omar", "-n", "Omar")
    })

    test("update -n renames an LLM employee and keeps its model", () => {
        const update = runCli("employee", "update", "claude", "-n", "Claude 2")
        const show = runCli("employee", "show", "claude").stdout

        expect(update.stdout).toBe('Updated employee "claude".\n')
        expect(show).toStartWith("# Claude 2\n")
        expect(show).toContain("model: claude-opus-5-5\n")
    })

    test("update -m gives it another model of its provider", () => {
        runCli("employee", "update", "claude", "-m", "claude-haiku-4-5")

        const show = runCli("employee", "show", "claude").stdout

        expect(show).toContain("model: claude-haiku-4-5\n")
    })

    test("update -p and -m move it to another provider", () => {
        const update = ["employee", "update", "claude"]

        runCli(...update, "-p", "ollama", "-m", "llama-3-1-8b")

        const list = runCli("employee", "list").stdout
        expect(list).toContain("ollama/llama-3-1-8b")
    })

    test("update refuses a pair that doesn't exist", () => {
        const update = runCli("employee", "update", "claude", "-p", "ollama")
        const show = runCli("employee", "show", "claude").stdout

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain('"ollama" has no model "claude-opus')
        expect(show).toContain("provider: anthropic\n")
    })

    test("update refuses a provider or a model for a human", () => {
        const update = runCli("employee", "update", "omar", "-m", "x")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain("is a human")
    })

    test("update -n renames a human", () => {
        runCli("employee", "update", "omar", "-n", "Omar Aboudou")

        const show = runCli("employee", "show", "omar").stdout

        expect(show).toStartWith("# Omar Aboudou\n\nkind: human\n")
    })

    test("update requires at least one option", () => {
        const update = runCli("employee", "update", "claude")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain("Nothing to update")
    })
})

describe("an employee's id history", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
    })

    async function history(id: string): Promise<History> {
        const path = projectPath(".llmco", "employees", id, "history.json")
        const { createdAt, formerIds } = await Bun.file(path).json()
        return { createdAt, formerIds }
    }

    test("update keeps the history", async () => {
        runCli("employee", "create", "human", "developer", "-n", "Dev")
        runCli("employee", "update-id", "developer", "api-developer")
        const before = await history("api-developer")

        runCli("employee", "update", "api-developer", "-n", "API Dev")
        const after = await history("api-developer")

        expect(before.formerIds).toHaveLength(1)
        expect(after).toEqual(before)
    })
})
