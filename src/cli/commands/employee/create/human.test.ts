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
        await createCompany(projectRoot, { name: "Acme", description: "" })
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

    test("create human rejects a model", () => {
        const creation = runCli(
            "employee",
            "create",
            "human",
            "omar",
            "-n",
            "Omar",
            "-m",
            "x",
        )

        expect(creation.exitCode).toBe(1)
        expect(creation.stderr).toContain("unknown option '-m'")
    })
})

describe("--reuse-id", () => {
    const committer = { name: "Omar Aboudou", email: "omar@example.com" }
    const threadId = "2026-10-18-budget"

    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
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
            mentions: [],
            sentAt,
            body: "Done.",
        })
    }

    const earlierSentAt = "2026-10-18T14:01:00.000Z"

    test("create refuses an id an earlier employee wrote under", async () => {
        await archiveMessageBy("claude", earlierSentAt)
        const hire = ["employee", "create", "human", "claude", "-n", "C"]
        const usedBeforeMessage = `was used before: in thread "${threadId}".`

        const creation = runCli(...hire)

        expect(creation.exitCode).toBe(1)
        expect(creation.stderr).toContain(usedBeforeMessage)
        expect(creation.stderr).toContain("add --reuse-id")
        expect(runCli("employee", "show", "claude").exitCode).toBe(1)
    })

    test.each(["--reuse-id", "-r"])(
        "create %s reuses it anyway",
        async (flag) => {
            await archiveMessageBy("claude", earlierSentAt)
            const hire = ["employee", "create", "human", "claude", "-n", "C"]

            const creation = runCli(...hire, flag)

            expect(creation.exitCode).toBe(0)
            expect(runCli("employee", "show", "claude").exitCode).toBe(0)
        },
    )
})
