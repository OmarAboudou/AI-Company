import { beforeEach, describe, expect, test } from "bun:test"
import { createCompany } from "../../../organization/company/create-company.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { startCliWithEnv, getProjectPath } = useTemporaryProject()

const sessionTimeoutMs = 30_000

beforeEach(async () => {
    await createCompany(getProjectPath(), { name: "Acme", description: "" })
})

function startSession() {
    return startCliWithEnv({}, "task", "work")
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
})
