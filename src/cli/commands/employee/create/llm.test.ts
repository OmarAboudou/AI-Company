import { beforeEach, describe, expect, test } from "bun:test"
import { createLlmConnection } from "../../../../llm/connection/create-llm-connection.ts"
import { createLlmModel } from "../../../../llm/model/create-llm-model.ts"
import { createLlmProvider } from "../../../../llm/provider/create-llm-provider.ts"
import { saveMessage } from "../../../../messaging/message/storage.ts"
import { saveThread } from "../../../../messaging/thread/storage.ts"
import { createCompany } from "../../../../organization/company/create-company.ts"
import { useTemporaryProject } from "../../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico employee", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme" })
        await createLlmProvider(projectRoot, "anthropic", { name: "Anthropic" })
        await createLlmConnection(
            projectRoot,
            "anthropic",
            "anthropic-messages",
            { baseUrl: "https://api.anthropic.com" },
        )
        await createLlmModel(projectRoot, "anthropic", "claude-opus-5-5", {
            name: "Claude Opus 5.5",
            apiId: "claude-opus-5-5",
        })
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

        const duplicate = runCli(
            "employee",
            "create",
            "human",
            "claude-senior",
            "-n",
            "X",
        )

        expect(duplicate.exitCode).toBe(1)
        expect(runCli("employee", "show", "claude-senior").stdout).toContain(
            "# Claude Senior",
        )
    })

    test("create llm requires a provider and a model", () => {
        const create = ["employee", "create", "llm", "x", "-n", "X"]

        const hiringWithoutModel = runCli(...create, "-p", "anthropic")
        const hiringWithoutProvider = runCli(...create, "-m", "claude-opus-5-5")

        expect(hiringWithoutModel.exitCode).toBe(1)
        expect(hiringWithoutProvider.exitCode).toBe(1)
    })
})

describe("--reuse-id", () => {
    const committer = { name: "Omar Aboudou", email: "omar@example.com" }
    const threadId = "2026-10-18-budget"

    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme" })
    })

    async function archiveMessageBy(employeeId: string, sentAt: string) {
        await saveThread(getProjectPath(), {
            id: threadId,
            subject: "Budget",
            createdAt: "2026-10-18T14:00:00.000Z",
            createdBy: {
                position: { id: "director", title: "Director" },
                committer,
            },
        })
        await saveMessage(getProjectPath(), {
            threadId,
            id: "20261018-140100-000-0000",
            position: { id: "developer", title: "Developer" },
            employee: { id: employeeId, name: "Earlier" },
            committer,
            sentAt,
            body: "Done.",
        })
    }

    const earlierSentAt = "2026-10-18T14:01:00.000Z"

    test("create llm takes --reuse-id too", async () => {
        await archiveMessageBy("claude", earlierSentAt)
        runCli("provider", "create", "anthropic", "-n", "Anthropic")
        const url = "https://api.anthropic.com"
        const connect = ["provider", "connection", "create", "anthropic"]
        runCli(...connect, "anthropic-messages", "-u", url)
        runCli("model", "create", "anthropic", "opus", "-n", "Opus", "-a", "o")
        const hire = ["employee", "create", "llm", "claude", "-n", "Claude"]
        const hireOnOpus = [...hire, "-p", "anthropic", "-m", "opus"]

        const refusal = runCli(...hireOnOpus)
        const reuse = runCli(...hireOnOpus, "-r")

        expect(refusal.exitCode).toBe(1)
        expect(reuse.exitCode).toBe(0)
    })
})
