import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, runCliWithEnv } = useTemporaryProject()

const interimEmployee = ["position", "interim", "employee"]

function createEmployeeEnv(employeeId: string) {
    return { LLMCO_CURRENT_HUMAN_ID: employeeId }
}

const julieEnv = createEmployeeEnv("julie")

beforeEach(() => {
    runCli("init", "-n", "Acme")
    runCli("employee", "create", "human", "julie", "-n", "Julie")
    runCli("employee", "create", "human", "bob", "-n", "Bob")
    for (const id of ["graphics", "support", "design", "sales"]) {
        runCli("position", "create", id, "-t", id)
    }
})

describe("llmco current-human", () => {
    test("without LLMCO_CURRENT_HUMAN_ID, shows a director, named by git", () => {
        const currentHumanRun = runCli("current-human")

        expect(currentHumanRun.exitCode).toBe(0)
        expect(currentHumanRun.stdout).toBe(
            "Test User, a director\n" +
                "positions: director\n" +
                "committer: Test User <test@example.com>\n",
        )
    })

    test("marks the position selected in this shell", () => {
        const directorEnv = { LLMCO_CURRENT_POSITION_ID: "director" }
        const positionsLine = "positions: director (selected)\n"

        const currentHumanRun = runCliWithEnv(directorEnv, "current-human")

        expect(currentHumanRun.stdout).toContain(positionsLine)
    })

    test("whoami is an alias of current-human", () => {
        const whoami = runCli("whoami")

        expect(whoami.exitCode).toBe(0)
        expect(whoami.stdout).toBe(runCli("current-human").stdout)
    })

    test("shows the human employee LLMCO_CURRENT_HUMAN_ID names, and the committer", () => {
        const currentHumanRun = runCliWithEnv(julieEnv, "current-human")

        expect(currentHumanRun.exitCode).toBe(0)
        expect(currentHumanRun.stdout).toBe(
            "Julie (julie), a human employee\n" +
                "positions: (none)\n" +
                "committer: Test User <test@example.com>\n",
        )
    })

    test("lists the positions the employee works now, by default or temporarily", () => {
        runCli("position", "assign", "graphics", "julie")
        runCli("position", "assign", "design", "julie")
        runCli(...interimEmployee, "design", "bob")
        runCli(...interimEmployee, "support", "julie")

        const currentHumanRun = runCliWithEnv(julieEnv, "current-human")

        expect(currentHumanRun.stdout).toContain(
            "positions: graphics, support (temporarily)\n",
        )
    })

    test("refuses an id naming no employee", () => {
        const eveEnv = createEmployeeEnv("eve")

        const currentHumanRun = runCliWithEnv(eveEnv, "current-human")

        expect(currentHumanRun.exitCode).toBe(1)
        expect(currentHumanRun.stderr).toContain('names no employee: "eve"')
    })
})
