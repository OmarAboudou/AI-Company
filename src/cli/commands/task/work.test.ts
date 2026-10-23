import { beforeEach, describe, expect, test } from "bun:test"
import { createExampleTicket } from "../../../messaging/ticket/create-example-ticket.testing.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, startCliWithEnv, getProjectPath } = useTemporaryProject()

const sessionTimeoutMs = 30_000

// The QA position, held by the user, is selected: the founder's
// What now?, which always waits, would never let a session wait.
beforeEach(async () => {
    const projectRoot = getProjectPath()
    await createCompany(projectRoot, { name: "Acme" })
    await createPosition(projectRoot, "qa-tester", {
        title: "QA",
        description: "",
    })
})

function startSession() {
    return startCliWithEnv(
        { AICO_CURRENT_POSITION_ID: "qa-tester" },
        "task",
        "work",
    )
}

describe("aico task work", () => {
    test(
        "waits for the person's next task, until Ctrl+D",
        async () => {
            const session = startSession()
            await session.waitForOutput("Waiting for your next task.")

            session.write("\x04")

            const { exitCode, stdout } = await session.exited()
            expect(exitCode).toBe(0)
            expect(stdout).toEndWith("\nSession ended.\n")
        },
        sessionTimeoutMs,
    )

    test(
        "lets the person end their session, which gives them Resume",
        async () => {
            await createExampleTicket(getProjectPath(), {
                title: "Release",
                rawAssigneePositionId: "qa-tester",
            })
            const session = startSession()
            await session.waitForOutput("Turn 1: what now?")

            session.write("\x1b[B".repeat(5))
            session.write("\r")
            await session.waitForOutput(
                "Task done: its session ended without passing the hand.",
            )
            await session.waitForOutput("Resume your work on ticket #1")
            session.write("\x04")

            const { exitCode } = await session.exited()
            expect(exitCode).toBe(0)
        },
        sessionTimeoutMs,
    )

    test(
        "ends on the SIGINT a terminal sends for Ctrl+C between questions",
        async () => {
            const session = startSession()
            await session.waitForOutput("Waiting for your next task.")

            session.process.kill("SIGINT")

            const { exitCode, stdout } = await session.exited()
            expect(exitCode).toBe(0)
            expect(stdout).toEndWith("\nSession ended.\n")
        },
        sessionTimeoutMs,
    )

    test(
        "says, while waiting, that the company is paused",
        async () => {
            runCli("company", "pause")
            const session = startSession()

            await session.waitForOutput(
                "The company is paused: only the founder's tasks open until `aico company relaunch`.",
            )
            session.write("\x04")

            const { exitCode } = await session.exited()
            expect(exitCode).toBe(0)
        },
        sessionTimeoutMs,
    )
})
