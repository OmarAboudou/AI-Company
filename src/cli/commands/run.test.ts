import { beforeEach, describe, expect, test } from "bun:test"
import { sendMessage } from "../../messaging/message/send-message.ts"
import { createThread } from "../../messaging/thread/create-thread.ts"
import { createCompany } from "../../organization/company/create-company.ts"
import { createPosition } from "../../organization/position/create-position.ts"
import { createExampleWorkCatalog } from "../../work/create-example-work-catalog.testing.ts"
import { useTemporaryProject } from "../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico run", () => {
    let threadId = ""

    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme" })
        await createPosition(projectRoot, "qa-tester", {
            title: "QA Tester",
            description: "",
        })
        const { thread } = await createThread(
            projectRoot,
            {},
            { subject: "Release" },
        )
        threadId = thread.id
    })

    test("says when no task is ready, nor waiting", () => {
        const running = runCli("run")

        expect(running.exitCode).toBe(0)
        expect(running.stdout).toBe("No task is ready, nor waiting.\n")
    })

    test("lists the tasks left waiting, and why", async () => {
        await sendMessage(
            getProjectPath(),
            {},
            threadId,
            { body: "A test plan?" },
            createExampleWorkCatalog(["qa-tester"]),
        )

        const running = runCli("run")

        expect(running.exitCode).toBe(0)
        expect(running.stdout).toContain("No task is ready. These wait:")
        expect(running.stdout).toMatch(
            /@qa-tester +example +of a type this version of AICo doesn't know/,
        )
    })
})
