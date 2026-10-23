import { beforeEach, describe, expect, test } from "bun:test"
import { saveMessage } from "../../../messaging/message/storage.ts"
import { saveThread } from "../../../messaging/thread/storage.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createEmployee } from "../../../organization/employee/create-employee.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

const interimEmployee = ["position", "interim", "employee"]

async function loadTemporaryAssignee(positionId: string): Promise<unknown> {
    const pathSegments = [".aico", ".state", "positions", `${positionId}.json`]
    const stateFile = Bun.file(getProjectPath(...pathSegments))
    return (await stateFile.exists())
        ? (await stateFile.json()).temporaryAssignment
        : undefined
}

function createEmployeeWorker(employeeId: string) {
    return { kind: "employee", employeeId }
}

describe("aico employee update-id", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
        await Promise.all([
            createEmployee(projectRoot, "omar", {
                name: "Omar",
                kind: "human",
            }),
            createEmployee(projectRoot, "alice", {
                name: "Alice",
                kind: "human",
            }),
            createPosition(projectRoot, "developer", {
                title: "Developer",
                description: "",
            }),
            createPosition(projectRoot, "qa-tester", {
                title: "QA Tester",
                description: "",
            }),
        ])
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

        const before = await loadTemporaryAssignee("qa-tester")

        const update = runCli("employee", "update-id", "omar", "omar-a")
        const after = await loadTemporaryAssignee("qa-tester")

        expect(update.stdout).toContain(
            "updated positions: developer, qa-tester (temporarily).",
        )
        expect(before).toEqual(createEmployeeWorker("omar"))
        expect(after).toEqual(createEmployeeWorker("omar-a"))
    })

    test("update-id refuses an id another employee has", () => {
        const update = runCli("employee", "update-id", "omar", "alice")
        const show = runCli("employee", "show", "alice").stdout

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain('Employee "alice" already exists.')
        expect(show).toStartWith("# Alice\n")
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

    test("update-id refuses an id an earlier employee wrote under", async () => {
        await archiveMessageBy("claude", earlierSentAt)
        runCli("employee", "create", "human", "claudia", "-n", "Claudia")

        const rename = ["employee", "update-id", "claudia", "claude"]

        const refusal = runCli(...rename)
        const reuse = runCli(...rename, "-r")

        expect(refusal.exitCode).toBe(1)
        expect(refusal.stderr).toContain("add --reuse-id")
        expect(reuse.exitCode).toBe(0)
    })
})
