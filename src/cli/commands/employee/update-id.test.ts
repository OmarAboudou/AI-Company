import { beforeEach, describe, expect, test } from "bun:test"
import { saveExampleLlmModel } from "../../../llm/model/save-example-llm-model.testing.ts"
import { saveMessage } from "../../../messaging/message/storage.ts"
import { saveNewTicket } from "../../../messaging/ticket/storage.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createEmployee } from "../../../organization/employee/create-employee.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico employee update-id", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme" })
        await saveExampleLlmModel(projectRoot)
        await Promise.all([
            createPosition(projectRoot, "developer", {
                title: "Developer",
                description: "",
            }),
            createPosition(projectRoot, "qa-tester", {
                title: "QA Tester",
                description: "",
            }),
        ])
        await createEmployee(projectRoot, "omar", {
            name: "Omar",
            kind: "llm",
            providerId: "anthropic",
            modelId: "opus",
        })
        await createEmployee(projectRoot, "alice", {
            name: "Alice",
            kind: "llm",
            providerId: "anthropic",
            modelId: "opus",
        })
    })

    test("update-id moves an employee who fills no position", () => {
        const update = runCli("employee", "update-id", "omar", "omar-a")
        const show = runCli("employee", "show", "omar-a").stdout

        expect(update.stdout).toBe('Employee "omar" is now "omar-a".\n')
        expect(show).toStartWith("# Omar\n\nkind: llm\n")
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
})

describe("--reuse-id", () => {
    const committer = { name: "Omar Aboudou", email: "omar@example.com" }
    const ticketNumber = 1

    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme" })
        await saveExampleLlmModel(projectRoot)
    })

    async function archiveMessageBy(employeeId: string, sentAt: string) {
        await saveNewTicket(getProjectPath(), {
            number: ticketNumber,
            title: "Budget",
            requester: { id: "founder", title: "Founder" },
            assignee: { id: "developer", title: "Developer" },
            committer,
            createdAt: "2026-10-18T14:00:00.000Z",
            request: "How much?",
        })
        await saveMessage(getProjectPath(), {
            ticketNumber,
            id: "20261018-140100-000-0000",
            position: { id: "developer", title: "Developer" },
            employee: { id: employeeId, name: "Earlier" },
            committer,
            sentAt,
            body: "Done.",
        })
    }

    const earlierSentAt = "2026-10-18T14:01:00.000Z"

    test("update-id refuses an id an earlier employee wrote under", async () => {
        await archiveMessageBy("claude", earlierSentAt)
        runCli(
            "employee",
            "create",
            "llm",
            "claudia",
            "-n",
            "Claudia",
            "-p",
            "anthropic",
            "-m",
            "opus",
        )

        const rename = ["employee", "update-id", "claudia", "claude"]

        const refusal = runCli(...rename)
        const reuse = runCli(...rename, "-r")

        expect(refusal.exitCode).toBe(1)
        expect(refusal.stderr).toContain("add --reuse-id")
        expect(reuse.exitCode).toBe(0)
    })
})
