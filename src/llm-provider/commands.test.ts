import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../cli-test-helpers.ts"

const { runCli } = useTemporaryProject()

describe("llmco provider", () => {
    beforeEach(() => {
        runCli("init", "--name", "Acme")
    })

    function createAnthropic() {
        return runCli("provider", "create", "anthropic", "-n", "Anthropic")
    }

    test("create then show displays the name", () => {
        expect(createAnthropic().exitCode).toBe(0)

        const show = runCli("provider", "show", "anthropic")
        expect(show.exitCode).toBe(0)
        expect(show.stdout).toBe("# Anthropic\n\nmodels: (none)\n")
    })

    test("show lists the provider's models, sorted by id", () => {
        createAnthropic()
        const create = ["model", "create", "anthropic"]
        runCli(...create, "claude-opus-5-5", "-n", "Opus", "-a", "opus")
        runCli(...create, "claude-haiku-4-5", "-n", "Haiku", "-a", "haiku")

        const show = runCli("provider", "show", "anthropic").stdout

        expect(show).toContain("models: claude-haiku-4-5, claude-opus-5-5\n")
    })

    test("list aligns names after the ids, sorted by id", () => {
        runCli("provider", "create", "ollama", "-n", "Ollama")
        createAnthropic()

        const list = runCli("provider", "list").stdout

        expect(list).toBe("anthropic  Anthropic\nollama     Ollama\n")
    })

    test("list says so when there is no provider", () => {
        const list = runCli("provider", "list")

        expect(list.exitCode).toBe(0)
        expect(list.stdout).toContain("No providers yet.")
    })

    test("create refuses an existing id", () => {
        createAnthropic()

        const second = runCli("provider", "create", "anthropic", "-n", "Other")
        const show = runCli("provider", "show", "anthropic").stdout

        expect(second.exitCode).toBe(1)
        expect(show).toContain("# Anthropic\n")
    })

    test("create rejects an id that is not kebab-case", () => {
        const create = runCli("provider", "create", "Anthropic", "-n", "A")

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain("kebab-case")
    })

    test("show fails for an unknown provider", () => {
        const show = runCli("provider", "show", "anthropic")

        expect(show.exitCode).toBe(1)
        expect(show.stderr).toContain('No provider "anthropic".')
    })
})

describe("llmco provider update", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("provider", "create", "anthropic", "-n", "Anthropic")
    })

    test("update -n changes the name", () => {
        const update = runCli("provider", "update", "anthropic", "-n", "A.")
        const list = runCli("provider", "list").stdout

        expect(update.stdout).toBe('Updated provider "anthropic".\n')
        expect(list).toBe("anthropic  A.\n")
    })

    test("update requires at least one option", () => {
        const update = runCli("provider", "update", "anthropic")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain("Nothing to update")
    })

    test("update fails for an unknown provider", () => {
        const update = runCli("provider", "update", "ollama", "-n", "Ollama")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain('No provider "ollama".')
    })
})

describe("llmco provider update-id", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("provider", "create", "anthropic", "-n", "Anthropic")
        runCli("provider", "create", "ollama", "-n", "Ollama")
        runCli("model", "create", "anthropic", "opus", "-n", "Opus", "-a", "o")
    })

    test("update-id moves the provider with its models", () => {
        const update = runCli("provider", "update-id", "anthropic", "claude")
        const models = runCli("model", "list").stdout

        expect(update.stdout).toBe('Provider "anthropic" is now "claude".\n')
        expect(models).toBe("claude/opus  Opus\n")
        expect(runCli("provider", "show", "anthropic").exitCode).toBe(1)
    })

    test("update-id rewrites the employees running on it", () => {
        const hire = ["employee", "create", "llm", "claude", "-n", "Claude"]
        runCli(...hire, "-p", "anthropic", "-m", "opus")

        const update = runCli("provider", "update-id", "anthropic", "claude")
        const show = runCli("employee", "show", "claude").stdout

        expect(update.stdout).toContain("updated employees: claude.")
        expect(show).toContain("provider: claude\nmodel: opus\n")
    })

    test("update-id refuses an id another provider has", () => {
        const update = runCli("provider", "update-id", "anthropic", "ollama")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain('Provider "ollama" already exists.')
        expect(runCli("model", "list").stdout).toContain("anthropic/opus")
    })

    test("update-id fails for an unknown provider", () => {
        const update = runCli("provider", "update-id", "groq", "groq-api")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain('No provider "groq".')
    })
})

describe("llmco provider delete", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("provider", "create", "anthropic", "-n", "Anthropic")
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

    test("delete refuses a provider an employee runs on, even with --force", () => {
        createModel("claude-opus-5-5")
        const hire = ["employee", "create", "llm", "claude", "-n", "Claude"]
        runCli(...hire, "-p", "anthropic", "-m", "claude-opus-5-5")

        const deletion = runCli("provider", "delete", "anthropic", "--force")

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toContain("is used by claude.")
        expect(runCli("provider", "show", "anthropic").exitCode).toBe(0)
    })

    test("delete fails for an unknown provider", () => {
        const deletion = runCli("provider", "delete", "ollama")

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toContain('No provider "ollama".')
    })
})

test("provider commands require a company", () => {
    expect(runCli("provider", "list").exitCode).toBe(1)
})
