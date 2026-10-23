import { beforeEach, describe, expect, test } from "bun:test"
import { useFakeAnthropicServer } from "../../llm/anthropic-messages/use-fake-anthropic-server.testing.ts"
import { createExampleTicket } from "../../messaging/ticket/create-example-ticket.testing.ts"
import { createCompany } from "../../organization/company/create-company.ts"
import { assignPosition } from "../../organization/position/assign-position.ts"
import { createPosition } from "../../organization/position/create-position.ts"
import { createLlmEmployee } from "../../work/create-company-with-llm-employee.testing.ts"
import { createExampleWorkCatalog } from "../../work/create-example-work-catalog.testing.ts"
import { sendExampleMessage } from "../../work/send-example-message.testing.ts"
import { useTemporaryProject } from "../use-temporary-project.testing.ts"

const { runCli, runCliAsync, startCliWithEnv, getProjectPath } =
    useTemporaryProject()
const fakeServer = useFakeAnthropicServer()

const runTimeoutMs = 30_000

async function waitForModelCall(): Promise<void> {
    while (fakeServer.requests.length === 0) {
        await Bun.sleep(10)
    }
}

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

    test("lists the tasks waiting for the company's relaunch", async () => {
        const projectRoot = getProjectPath()
        await createLlmEmployee(projectRoot, fakeServer.getUrl())
        await assignPosition(projectRoot, "qa-tester", "claude")
        await createExampleTicket(projectRoot, {
            title: "Release",
            rawAssigneePositionId: "qa-tester",
        })
        runCli("company", "pause")

        const running = runCli("run")

        expect(running.exitCode).toBe(0)
        expect(running.stdout).toMatch(
            /@qa-tester +handle +until the company is relaunched\n\nThe company is paused: `aico company relaunch` relaunches it\.\n$/,
        )
        expect(fakeServer.requests).toHaveLength(0)
    })

    test("pauses the company at a task that fails", async () => {
        const projectRoot = getProjectPath()
        await createLlmEmployee(projectRoot, fakeServer.getUrl())
        await assignPosition(projectRoot, "qa-tester", "claude")
        await createExampleTicket(projectRoot, {
            title: "Release",
            rawAssigneePositionId: "qa-tester",
        })
        fakeServer.respondWith({ status: 401, error: "invalid x-api-key" })

        const running = await runCliAsync(
            { TEST_ANTHROPIC_KEY: "sk-test" },
            "run",
        )

        expect(running.exitCode).toBe(0)
        expect(running.stderr).toContain(
            "Task failed: The anthropic-messages API",
        )
        expect(running.stdout).toMatch(
            /@director +analyse-failure +for the directors\n\nThe company is paused since task "[^"]+" failed: the director analyses the failure in `aico task work`, then relaunches it with `aico company relaunch`\.\n$/,
        )
    })

    test(
        "stops at Ctrl+C, failing the task in progress",
        async () => {
            const projectRoot = getProjectPath()
            await createLlmEmployee(projectRoot, fakeServer.getUrl())
            await assignPosition(projectRoot, "qa-tester", "claude")
            await createExampleTicket(projectRoot, {
                title: "Release",
                rawAssigneePositionId: "qa-tester",
            })
            fakeServer.respondWith({ isHanging: true })
            const running = startCliWithEnv(
                { TEST_ANTHROPIC_KEY: "sk-test" },
                "run",
            )
            await waitForModelCall()

            running.process.kill("SIGINT")

            const { exitCode, stderr } = await running.exited()
            expect(exitCode).toBe(130)
            expect(stderr).toContain(
                "Task failed: aico run was stopped during the session.",
            )
        },
        runTimeoutMs,
    )
})
