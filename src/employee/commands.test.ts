import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../cli-test-helpers.ts"

type History = {
    createdAt: string
}

const { runCli, projectPath } = useTemporaryProject()

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

    function createClaude() {
        return runCli(
            "employee",
            "create",
            "llm",
            "claude-senior",
            "--name",
            "Claude Senior",
            "--provider",
            "anthropic",
            "--model",
            "claude-opus-5-5",
        )
    }

    test("create llm then show displays the provider and model", () => {
        expect(createClaude().exitCode).toBe(0)

        const show = runCli("employee", "show", "claude-senior")
        expect(show.exitCode).toBe(0)
        expect(show.stdout).toBe(
            "# Claude Senior\n\nkind: llm\nprovider: anthropic\nmodel: claude-opus-5-5\npositions: (none)\n",
        )
    })

    test("hire is an alias of create", () => {
        const hire = runCli("employee", "hire", "human", "omar", "-n", "Omar")
        expect(hire.exitCode).toBe(0)

        expect(runCli("employee", "show", "omar").stdout).toBe(
            "# Omar\n\nkind: human\npositions: (none)\n",
        )
    })

    test("list aligns names and models after the ids, sorted by id", () => {
        runCli("employee", "create", "human", "omar", "-n", "Omar Aboudou")
        createClaude()

        expect(runCli("employee", "list").stdout).toBe(
            "claude-senior  Claude Senior  anthropic/claude-opus-5-5\n" +
                "omar           Omar Aboudou   human\n",
        )
    })

    test("list says so when there is no employee", () => {
        const list = runCli("employee", "list")

        expect(list.exitCode).toBe(0)
        expect(list.stdout).toContain("No employees yet.")
    })

    test("create refuses an existing id", () => {
        createClaude()

        const second = runCli(
            "employee",
            "create",
            "human",
            "claude-senior",
            "-n",
            "X",
        )

        expect(second.exitCode).toBe(1)
        expect(runCli("employee", "show", "claude-senior").stdout).toContain(
            "# Claude Senior",
        )
    })

    test("create llm requires a provider and a model", () => {
        const create = ["employee", "create", "llm", "x", "-n", "X"]

        const withoutModel = runCli(...create, "-p", "anthropic")
        const withoutProvider = runCli(...create, "-m", "claude-opus-5-5")

        expect(withoutModel.exitCode).toBe(1)
        expect(withoutProvider.exitCode).toBe(1)
    })

    test("create llm requires an existing provider", () => {
        const create = ["employee", "create", "llm", "x", "-n", "X"]

        const hire = runCli(...create, "-p", "bedrock", "-m", "claude-opus-5-5")

        expect(hire.exitCode).toBe(1)
        expect(hire.stderr).toContain('No provider "bedrock".')
    })

    test("create llm requires a model of that provider", () => {
        const create = ["employee", "create", "llm", "x", "-n", "X"]

        const hire = runCli(...create, "-p", "anthropic", "-m", "gpt-5")

        expect(hire.exitCode).toBe(1)
        expect(hire.stderr).toContain('"anthropic" has no model "gpt-5"')
        expect(runCli("employee", "show", "x").exitCode).toBe(1)
    })

    test("create llm rejects a model id that is not kebab-case", () => {
        const create = runCli(
            "employee",
            "create",
            "llm",
            "local",
            "-n",
            "Local",
            "-p",
            "ollama",
            "-m",
            "llama3.1:8b",
        )

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain("kebab-case")
        expect(create.stderr).toContain("at modelId")
    })

    test("create human rejects a model", () => {
        const create = runCli(
            "employee",
            "create",
            "human",
            "omar",
            "-n",
            "Omar",
            "-m",
            "x",
        )

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain("unknown option '-m'")
    })

    test("create requires the kind before the id", () => {
        const create = runCli("employee", "create", "omar", "-n", "Omar")

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain("unknown command 'omar'")
    })

    test("show fails for an unknown employee", () => {
        expect(runCli("employee", "show", "omar").exitCode).toBe(1)
    })
})

test("employee commands require a company", () => {
    expect(runCli("employee", "list").exitCode).toBe(1)
})

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

describe("llmco employee update-id", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("employee", "create", "human", "omar", "-n", "Omar")
        runCli("employee", "create", "human", "alice", "-n", "Alice")
        runCli("position", "create", "developer", "-t", "Developer")
        runCli("position", "create", "qa-tester", "-t", "QA Tester")
    })

    test("update-id moves an employee who fills no position", () => {
        const update = runCli("employee", "update-id", "omar", "omar-a")
        const show = runCli("employee", "show", "omar-a").stdout

        expect(update.stdout).toBe('Employee "omar" is now "omar-a".\n')
        expect(show).toStartWith("# Omar\n\nkind: human\n")
        expect(runCli("employee", "show", "omar").exitCode).toBe(1)
    })

    test("update-id rewrites the positions it fills", () => {
        runCli("position", "assign", "developer", "omar")
        runCli("position", "assign", "qa-tester", "omar")

        const update = runCli("employee", "update-id", "omar", "omar-a")
        const list = runCli("position", "list").stdout

        expect(update.stdout).toContain("updated positions: developer, qa-")
        expect(list).toContain("developer  Developer  omar-a\n")
        expect(list).toContain("qa-tester  QA Tester  omar-a\n")
    })

    test("update-id refuses an id another employee has", () => {
        const update = runCli("employee", "update-id", "omar", "alice")
        const show = runCli("employee", "show", "alice").stdout

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain('Employee "alice" already exists.')
        expect(show).toStartWith("# Alice\n")
    })

    test("update-id fails for an unknown employee", () => {
        const update = runCli("employee", "update-id", "bob", "robert")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain('No employee "bob".')
    })
})

describe("llmco employee replace", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("employee", "create", "human", "omar", "-n", "Omar")
        runCli("employee", "create", "human", "alice", "-n", "Alice")
        for (const id of ["developer", "qa-tester", "designer"]) {
            runCli("position", "create", id, "-t", id)
        }
        runCli("position", "assign", "developer", "omar")
        runCli("position", "assign", "qa-tester", "omar")
        runCli("position", "assign", "designer", "alice")
    })

    test("replace gives every position of an employee to another", () => {
        const replace = runCli("employee", "replace", "omar", "alice")
        const list = runCli("position", "list").stdout

        expect(replace.stdout).toContain("employee of developer, qa-tester;")
        expect(replace.stdout).toContain('"omar" stays hired.')
        expect(list).toContain("developer  developer  alice\n")
        expect(list).toContain("qa-tester  qa-tester  alice\n")
    })

    test("hand-over is an alias of replace", () => {
        const handOver = runCli("employee", "hand-over", "omar", "alice")

        expect(handOver.exitCode).toBe(0)
        expect(runCli("position", "list").stdout).not.toContain("omar")
    })

    test("replace keeps both employees and the replacement's positions", () => {
        runCli("employee", "replace", "omar", "alice")

        const list = runCli("employee", "list", "--positions").stdout

        expect(list).toContain("alice  Alice  human  designer, developer, qa-")
        expect(list).toContain("omar   Omar   human  (none)\n")
    })

    test("replace says so when the employee fills no position", () => {
        runCli("employee", "create", "human", "bob", "-n", "Bob")

        const replace = runCli("employee", "replace", "bob", "alice")

        expect(replace.exitCode).toBe(0)
        expect(replace.stdout).toContain("nothing to replace")
    })

    test("replace refuses an employee replacing itself", () => {
        const replace = runCli("employee", "replace", "omar", "omar")

        expect(replace.exitCode).toBe(1)
        expect(replace.stderr).toContain("can't replace itself")
    })

    test("replace fails for an unknown replacement", () => {
        const replace = runCli("employee", "replace", "omar", "bob")
        const list = runCli("position", "list").stdout

        expect(replace.exitCode).toBe(1)
        expect(replace.stderr).toContain('No employee "bob".')
        expect(list).toContain("developer  developer  omar\n")
    })
})

describe("llmco employee delete", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("employee", "create", "human", "omar", "-n", "Omar")
        runCli("position", "create", "developer", "-t", "Developer")
        runCli("position", "create", "qa-tester", "-t", "QA Tester")
    })

    test("delete removes an employee who fills no position", () => {
        const deletion = runCli("employee", "delete", "omar")

        expect(deletion.exitCode).toBe(0)
        expect(deletion.stdout).toBe('Deleted employee "omar".\n')
        expect(runCli("employee", "show", "omar").exitCode).toBe(1)
    })

    test("fire is an alias of delete", () => {
        expect(runCli("employee", "fire", "omar").exitCode).toBe(0)
        expect(runCli("employee", "list").stdout).toContain("No employees")
    })

    test("delete refuses an employee who fills positions", () => {
        runCli("position", "assign", "developer", "omar")
        runCli("position", "assign", "qa-tester", "omar")

        const deletion = runCli("employee", "delete", "omar")
        const list = runCli("position", "list").stdout

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toContain("default employee of developer, qa")
        expect(deletion.stderr).toContain("--force")
        expect(list).toContain("developer  Developer  omar\n")
        expect(list).toContain("qa-tester  QA Tester  omar\n")
    })

    test.each(["--force", "-f"])(
        "delete %s leaves the employee's positions vacant",
        (flag) => {
            runCli("position", "assign", "developer", "omar")
            runCli("position", "assign", "qa-tester", "omar")

            const deletion = runCli("employee", "delete", "omar", flag)
            const list = runCli("position", "list").stdout

            expect(deletion.exitCode).toBe(0)
            expect(deletion.stdout).toContain("vacant: developer, qa-tester")
            expect(list).toContain("developer  Developer  (vacant)\n")
            expect(list).toContain("qa-tester  QA Tester  (vacant)\n")
        },
    )

    test("delete fails for an unknown employee", () => {
        const deletion = runCli("employee", "delete", "claude")

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toContain('No employee "claude".')
    })
})

describe("an employee's id history", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
    })

    async function history(id: string): Promise<History> {
        const path = projectPath(".llmco", "employees", id, "config.json")
        const { createdAt } = await Bun.file(path).json()
        return { createdAt }
    }

    test("create records when the employee was created", async () => {
        const before = Date.now()
        runCli("employee", "create", "human", "developer", "-n", "Dev")
        const after = Date.now()

        const created = Date.parse((await history("developer")).createdAt)

        expect(created).toBeGreaterThanOrEqual(before)
        expect(created).toBeLessThanOrEqual(after)
    })
})
