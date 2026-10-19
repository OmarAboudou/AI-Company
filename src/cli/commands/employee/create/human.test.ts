import { beforeEach, describe, expect, test } from "bun:test"
import { saveMessage } from "../../../../messaging/message/storage.ts"
import { saveThread } from "../../../../messaging/thread/storage.ts"
import { useTemporaryProject } from "../../../use-temporary-project.ts"

const { runCli, getProjectPath } = useTemporaryProject()

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
})

describe("--reuse-id", () => {
    const committer = { name: "Omar Aboudou", email: "omar@example.com" }
    const threadId = "2026-10-18-budget"

    beforeEach(() => {
        runCli("init", "-n", "Acme")
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
})
