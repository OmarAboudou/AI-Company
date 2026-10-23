import { beforeEach, describe, expect, test } from "bun:test"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createEmployee } from "../../../organization/employee/create-employee.ts"
import { assignPosition } from "../../../organization/position/assign-position.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { startCliWithEnv, getProjectPath } = useTemporaryProject()

const sessionTimeoutMs = 30_000

beforeEach(async () => {
    const projectRoot = getProjectPath()
    await createCompany(projectRoot, { name: "Acme", description: "" })
    await createEmployee(projectRoot, "julie", { name: "Julie", kind: "human" })
    await createPosition(projectRoot, "qa-tester", {
        title: "QA",
        description: "",
    })
    await assignPosition(projectRoot, "qa-tester", "julie")
})

function startJulieSession() {
    return startCliWithEnv({ AICO_CURRENT_HUMAN_ID: "julie" }, "task", "work")
}

describe("aico task work", () => {
    test(
        "waits for the person's next task, until Ctrl+D",
        async () => {
            const session = startJulieSession()
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
            const session = startJulieSession()
            await session.waitForOutput("Waiting for your next task.")

            session.process.kill("SIGINT")

            const { exitCode, stdout } = await session.exited()
            expect(exitCode).toBe(0)
            expect(stdout).toEndWith("\nSession ended.\n")
        },
        sessionTimeoutMs,
    )
})
