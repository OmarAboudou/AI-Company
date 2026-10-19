import { beforeEach, describe, expect, test } from "bun:test"
import { saveMessage } from "../../../../message/storage.ts"
import { saveThread } from "../../../../thread/storage.ts"
import { useTemporaryProject } from "../../../use-temporary-project.ts"

type History = {
    createdAt: string
    formerIds?: { id: string; until: string }[]
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
})
