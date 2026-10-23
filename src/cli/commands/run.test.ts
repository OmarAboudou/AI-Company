import { beforeEach, describe, expect, test } from "bun:test"
import { createExampleTicket } from "../../messaging/ticket/create-example-ticket.testing.ts"
import { createCompany } from "../../organization/company/create-company.ts"
import { createPosition } from "../../organization/position/create-position.ts"
import { createExampleWorkCatalog } from "../../work/create-example-work-catalog.testing.ts"
import { sendExampleMessage } from "../../work/send-example-message.testing.ts"
import { useTemporaryProject } from "../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico run", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme" })
        await createPosition(projectRoot, "qa-tester", {
            title: "QA Tester",
            description: "",
        })
    })

    test("says when no task is ready, nor waiting", () => {
        const running = runCli("run")

        expect(running.exitCode).toBe(0)
        expect(running.stdout).toBe("No task is ready, nor waiting.\n")
    })

    test("lists the tasks left waiting, and why", async () => {
        await createExampleTicket(getProjectPath(), {
            title: "Release",
            rawAssigneePositionId: "qa-tester",
        })

        const running = runCli("run")

        expect(running.exitCode).toBe(0)
        expect(running.stdout).toContain("No task is ready. These wait:")
        expect(running.stdout).toMatch(
            /@qa-tester +handle +for a vacant position/,
        )
    })

    test("lists as waiting a task of a type it doesn't know", async () => {
        const ticket = await createExampleTicket(getProjectPath(), {
            title: "Release",
        })
        await sendExampleMessage(
            getProjectPath(),
            ticket.number,
            "A test plan?",
            createExampleWorkCatalog(["qa-tester"]),
        )

        const running = runCli("run")

        expect(running.stdout).toMatch(
            /@qa-tester +example +of a type this version of AICo doesn't know/,
        )
    })
})
