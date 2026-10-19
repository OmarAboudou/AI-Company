import { beforeEach, describe, expect, test } from "bun:test"
import { saveMessage } from "../../../../message/storage.ts"
import { saveThread } from "../../../../thread/storage.ts"
import { useTemporaryProject } from "../../../use-temporary-project.ts"

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
})
