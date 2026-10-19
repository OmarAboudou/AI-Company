import { beforeEach, describe, expect, test } from "bun:test"
import { saveMessage } from "../../../message/storage.ts"
import { saveThread } from "../../../thread/storage.ts"
import { useTemporaryProject } from "../../use-temporary-project.ts"

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

describe("an employee's id history", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
    })

    async function history(id: string): Promise<History> {
        const path = projectPath(".llmco", "employees", id, "history.json")
        const { createdAt, formerIds } = await Bun.file(path).json()
        return { createdAt, formerIds }
    }

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
