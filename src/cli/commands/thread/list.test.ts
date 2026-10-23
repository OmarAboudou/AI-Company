import { beforeEach, describe, expect, test } from "bun:test"
import { sendMessage } from "../../../messaging/message/send-message.ts"
import { createThread } from "../../../messaging/thread/create-thread.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { createExampleWorkCatalog } from "../../../work/create-example-work-catalog.testing.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

async function askTester(threadId: string): Promise<void> {
    await sendMessage(
        getProjectPath(),
        {},
        threadId,
        { body: "A test plan?" },
        createExampleWorkCatalog(["qa-tester"]),
    )
}

describe("aico thread list", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
    })

    function createThread(...args: string[]) {
        return runCli("thread", "create", "-s", "Choice of framework", ...args)
    }

    test("lists the threads with their subject, oldest first", () => {
        runCli("thread", "create", "-s", "Budget")
        createThread()

        const list = runCli("thread", "list").stdout
        const rows = list.trimEnd().split("\n")

        expect(rows).toHaveLength(2)
        expect(rows[0]).toMatch(/-budget +Budget$/)
        expect(rows[1]).toMatch(/-choice-of-framework +Choice of framework$/)
    })

    test("says so when there is no thread", () => {
        const list = runCli("thread", "list")

        expect(list.exitCode).toBe(0)
        expect(list.stdout).toContain("No threads yet.")
    })
})

describe("pending tasks", () => {
    let threadId = ""

    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
        const { thread } = await createThread(
            projectRoot,
            {},
            {
                subject: "Budget",
            },
        )
        threadId = thread.id
    })

    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await Promise.all([
            createPosition(projectRoot, "backend-developer", {
                title: "Backend",
                description: "",
            }),
            createPosition(projectRoot, "qa-tester", {
                title: "QA Tester",
                description: "",
            }),
        ])
    })

    test("thread list shows the positions with a pending task there", async () => {
        const before = runCli("thread", "list").stdout

        await askTester(threadId)
        const after = runCli("thread", "list").stdout

        expect(before).not.toContain("pending")
        expect(after).toContain("Budget  tasks pending for @qa-tester\n")
    })
})
