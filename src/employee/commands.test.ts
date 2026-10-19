import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../cli-test-helpers.ts"
import { saveMessage } from "../message/storage.ts"
import { saveThread } from "../thread/storage.ts"

type History = {
    createdAt: string
    formerIds?: { id: string; until: string }[]
}

const { runCli, projectPath } = useTemporaryProject()

const interimEmployee = ["position", "interim", "employee"]

async function temporaryAssignee(positionId: string): Promise<unknown> {
    const path = [".llmco", ".state", "positions", `${positionId}.json`]
    const file = Bun.file(projectPath(...path))
    return (await file.exists())
        ? (await file.json()).temporaryAssignment
        : undefined
}

function employeeWorker(employeeId: string) {
    return { kind: "employee", employeeId }
}

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

    test("update-id rewrites its temporary assignments", async () => {
        runCli("position", "assign", "developer", "omar")
        runCli(...interimEmployee, "qa-tester", "omar")

        const before = await temporaryAssignee("qa-tester")

        const update = runCli("employee", "update-id", "omar", "omar-a")
        const after = await temporaryAssignee("qa-tester")

        expect(update.stdout).toContain(
            "updated positions: developer, qa-tester (temporarily).",
        )
        expect(before).toEqual(employeeWorker("omar"))
        expect(after).toEqual(employeeWorker("omar-a"))
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

    test("replace keeps the employee's temporary assignments, and says so", async () => {
        runCli("position", "create", "support", "-t", "Support")
        runCli(...interimEmployee, "support", "omar")

        const replace = runCli("employee", "replace", "omar", "alice")

        expect(replace.stdout).toEndWith(
            '"omar" stays assigned temporarily to support.\n',
        )
        const after = await temporaryAssignee("support")
        expect(after).toEqual(employeeWorker("omar"))
    })

    test("replace ends the replacement's temporary assignment of a position it now fills", async () => {
        runCli(...interimEmployee, "developer", "alice")
        const before = await temporaryAssignee("developer")

        const replace = runCli("employee", "replace", "omar", "alice")
        const after = await temporaryAssignee("developer")

        expect(before).toEqual(employeeWorker("alice"))
        expect(replace.stdout).toContain(
            "Temporary assignments ended: developer.",
        )
        expect(after).toBeUndefined()
    })

    test.each(["--temporary", "-t"])(
        "replace %s hands over its temporary assignments too",
        async (flag) => {
            runCli("position", "create", "support", "-t", "Support")
            runCli(...interimEmployee, "support", "omar")

            const replace = runCli("employee", "replace", "omar", "alice", flag)
            const after = await temporaryAssignee("support")

            expect(replace.stdout).toBe(
                '"alice" replaces "omar" as default employee of developer, qa-tester and as temporary assignee of support; "omar" stays hired.\n',
            )
            expect(after).toEqual(employeeWorker("alice"))
        },
    )

    test("replace --temporary ends a temporary assignment where the replacement is the default employee", async () => {
        runCli(...interimEmployee, "designer", "omar")
        const before = await temporaryAssignee("designer")

        const replace = runCli("employee", "replace", "omar", "alice", "-t")
        const after = await temporaryAssignee("designer")

        expect(before).toEqual(employeeWorker("omar"))
        expect(replace.stdout).toContain(
            "Temporary assignments ended: designer.",
        )
        expect(after).toBeUndefined()
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

    test("delete refuses an employee assigned temporarily", async () => {
        runCli(...interimEmployee, "qa-tester", "omar")

        const deletion = runCli("employee", "delete", "omar")

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toBe(
            'Employee "omar" is assigned temporarily to qa-tester. Add --force to delete it anyway and end these temporary assignments.\n',
        )
        const after = await temporaryAssignee("qa-tester")
        expect(after).toEqual(employeeWorker("omar"))
    })

    test("delete --force ends its temporary assignments", async () => {
        runCli("position", "assign", "developer", "omar")
        runCli(...interimEmployee, "qa-tester", "omar")
        const before = await temporaryAssignee("qa-tester")

        const deletion = runCli("employee", "delete", "omar", "--force")
        const after = await temporaryAssignee("qa-tester")

        expect(deletion.stdout).toBe(
            'Deleted employee "omar"; now vacant: developer; temporary assignments ended: qa-tester.\n',
        )
        expect(before).toEqual(employeeWorker("omar"))
        expect(after).toBeUndefined()
    })

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
        const path = projectPath(".llmco", "employees", id, "history.json")
        const { createdAt, formerIds } = await Bun.file(path).json()
        return { createdAt, formerIds }
    }

    test("create records when the employee was created", async () => {
        const before = Date.now()
        runCli("employee", "create", "human", "developer", "-n", "Dev")
        const after = Date.now()

        const created = Date.parse((await history("developer")).createdAt)

        expect(created).toBeGreaterThanOrEqual(before)
        expect(created).toBeLessThanOrEqual(after)
    })

    test("leaves the history out of config.json", async () => {
        runCli("employee", "create", "human", "developer", "-n", "Dev")
        runCli("employee", "update-id", "developer", "api-developer")

        const path = projectPath(
            ".llmco",
            "employees",
            "api-developer",
            "config.json",
        )
        const config = { name: "Dev", kind: "human" }

        expect(await Bun.file(path).json()).toEqual(config)
    })

    test("update-id records each former id and when it stopped", async () => {
        runCli("employee", "create", "human", "developer", "-n", "Dev")
        const created = await history("developer")

        const before = Date.now()
        runCli("employee", "update-id", "developer", "api-developer")
        runCli("employee", "update-id", "api-developer", "backend-developer")
        const after = Date.now()

        const renamed = await history("backend-developer")
        const formerIds = renamed.formerIds ?? []
        const ids = formerIds.map(({ id }) => id)
        const untils = formerIds.map(({ until }) => Date.parse(until))

        expect(created.formerIds).toBeUndefined()
        expect(renamed.createdAt).toBe(created.createdAt)
        expect(ids).toEqual(["developer", "api-developer"])
        expect(Math.min(...untils)).toBeGreaterThanOrEqual(before)
        expect(Math.max(...untils)).toBeLessThanOrEqual(after)
    })

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

describe("--reuse-id", () => {
    const committer = { name: "Omar Aboudou", email: "omar@example.com" }
    const threadId = "2026-10-18-budget"

    beforeEach(() => {
        runCli("init", "-n", "Acme")
    })

    async function archiveMessageBy(employeeId: string, sentAt: string) {
        await saveThread(projectPath(), {
            id: threadId,
            subject: "Budget",
            createdAt: "2026-10-18T14:00:00.000Z",
            createdBy: {
                position: { id: "director", title: "Director" },
                committer,
            },
        })
        await saveMessage(projectPath(), {
            threadId,
            id: "20261018-140100-000-0000",
            position: { id: "developer", title: "Developer" },
            employee: { id: employeeId, name: "Earlier" },
            committer,
            mentions: [],
            sentAt,
            body: "Done.",
        })
    }

    const longAgo = "2026-10-18T14:01:00.000Z"

    test("create refuses an id an earlier employee wrote under", async () => {
        await archiveMessageBy("claude", longAgo)
        const hire = ["employee", "create", "human", "claude", "-n", "C"]
        const usedIn = `was used before: in thread "${threadId}".`

        const create = runCli(...hire)

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain(usedIn)
        expect(create.stderr).toContain("add --reuse-id")
        expect(runCli("employee", "show", "claude").exitCode).toBe(1)
    })

    test.each(["--reuse-id", "-r"])(
        "create %s reuses it anyway",
        async (flag) => {
            await archiveMessageBy("claude", longAgo)
            const hire = ["employee", "create", "human", "claude", "-n", "C"]

            const create = runCli(...hire, flag)

            expect(create.exitCode).toBe(0)
            expect(runCli("employee", "show", "claude").exitCode).toBe(0)
        },
    )

    test("create llm takes --reuse-id too", async () => {
        await archiveMessageBy("claude", longAgo)
        runCli("provider", "create", "anthropic", "-n", "Anthropic")
        const url = "https://api.anthropic.com"
        const connect = ["provider", "connection", "create", "anthropic"]
        runCli(...connect, "anthropic-messages", "-u", url)
        runCli("model", "create", "anthropic", "opus", "-n", "Opus", "-a", "o")
        const hire = ["employee", "create", "llm", "claude", "-n", "Claude"]
        const onOpus = [...hire, "-p", "anthropic", "-m", "opus"]

        const refused = runCli(...onOpus)
        const reused = runCli(...onOpus, "-r")

        expect(refused.exitCode).toBe(1)
        expect(reused.exitCode).toBe(0)
    })

    test("create names an existing employee before any earlier use", async () => {
        const hire = ["employee", "create", "human", "claude", "-n", "C"]
        runCli(...hire)
        await archiveMessageBy("claude", new Date().toISOString())

        const create = runCli(...hire)

        expect(create.stderr).toContain('Employee "claude" already exists.')
    })

    test("create refuses another employee's former id", () => {
        runCli("employee", "create", "human", "omar", "-n", "Omar")
        runCli("employee", "update-id", "omar", "omar-a")

        const create = runCli("employee", "create", "human", "omar", "-n", "O")

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain('as a former id of employee "omar-a"')
    })

    test("update-id refuses an id an earlier employee wrote under", async () => {
        await archiveMessageBy("claude", longAgo)
        runCli("employee", "create", "human", "claudia", "-n", "Claudia")

        const rename = ["employee", "update-id", "claudia", "claude"]

        const refused = runCli(...rename)
        const reused = runCli(...rename, "-r")

        expect(refused.exitCode).toBe(1)
        expect(refused.stderr).toContain("add --reuse-id")
        expect(reused.exitCode).toBe(0)
    })

    test("update-id gives an employee back its own former id", async () => {
        runCli("employee", "create", "human", "omar", "-n", "Omar")
        await archiveMessageBy("omar", new Date().toISOString())
        runCli("employee", "update-id", "omar", "omar-a")

        const update = runCli("employee", "update-id", "omar-a", "omar")

        expect(update.exitCode).toBe(0)
        expect(runCli("employee", "show", "omar").exitCode).toBe(0)
    })
})
