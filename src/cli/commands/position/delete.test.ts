import { beforeEach, describe, expect, test } from "bun:test"
import { saveExampleLlmModel } from "../../../llm/model/save-example-llm-model.testing.ts"
import { sendMessage } from "../../../messaging/message/send-message.ts"
import { createThread } from "../../../messaging/thread/create-thread.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { createExampleWorkCatalog } from "../../../work/create-example-work-catalog.testing.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

async function askDeveloper(): Promise<string> {
    const projectRoot = getProjectPath()
    const { thread } = await createThread(
        projectRoot,
        {},
        { subject: "Release" },
    )
    await sendMessage(
        projectRoot,
        {},
        thread.id,
        { body: "Can you check?" },
        createExampleWorkCatalog(["developer"]),
    )
    return thread.id
}

describe("aico position delete", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme" })
        await saveExampleLlmModel(projectRoot)
        await createPosition(projectRoot, "developer", {
            title: "Developer",
            description: "",
        })
    })

    test("delete removes the position", () => {
        const deletion = runCli("position", "delete", "developer")

        expect(deletion.exitCode).toBe(0)
        expect(deletion.stdout).toBe('Deleted position "developer".\n')
        expect(runCli("position", "show", "developer").exitCode).toBe(1)
    })

    test("close is an alias of delete", () => {
        expect(runCli("position", "close", "developer").exitCode).toBe(0)
        expect(runCli("position", "show", "developer").exitCode).toBe(1)
    })

    test("delete keeps the default employee hired", () => {
        runCli(
            "employee",
            "create",
            "llm",
            "omar",
            "-n",
            "Omar",
            "-p",
            "anthropic",
            "-m",
            "opus",
        )
        runCli("position", "assign", "developer", "omar")

        const deletion = runCli("position", "delete", "developer")
        const show = runCli("employee", "show", "omar")

        expect(deletion.exitCode).toBe(0)
        expect(deletion.stdout).toContain('default employee "omar" stays hired')
        expect(show.stdout).toContain("positions: (none)")
    })

    test("delete refuses a position with pending tasks, listing their threads", async () => {
        const threadId = await askDeveloper()

        const deletion = runCli("position", "delete", "developer")

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toContain(`in these threads: ${threadId}.`)
        expect(deletion.stderr).toContain("Add --force")
        expect(runCli("position", "show", "developer").exitCode).toBe(0)
    })

    test.each(["--force", "-f"])(
        "delete %s deletes a position with pending tasks",
        async (flag) => {
            const threadId = await askDeveloper()

            const deletion = runCli("position", "delete", "developer", flag)
            const list = runCli("thread", "list").stdout

            expect(deletion.stdout).toContain(`stay pending in: ${threadId}.`)
            expect(runCli("position", "show", "developer").exitCode).toBe(1)
            expect(list).toContain("tasks pending for @developer")
        },
    )
})
