import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../use-temporary-project.ts"

const { runCli, runCliWithEnv } = useTemporaryProject()

const interimEmployee = ["position", "interim", "employee"]

function switchedTo(employeeId: string) {
    return { LLMCO_CURRENT_HUMAN_ID: employeeId }
}

const asJulie = switchedTo("julie")

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
        const currentHuman = runCli("current-human")

        expect(currentHuman.exitCode).toBe(0)
        expect(currentHuman.stdout).toBe(
            "Test User, a director\n" +
                "positions: director\n" +
                "committer: Test User <test@example.com>\n",
        )
    })

    test("whoami is an alias of current-human", () => {
        const whoami = runCli("whoami")

        expect(whoami.exitCode).toBe(0)
        expect(whoami.stdout).toBe(runCli("current-human").stdout)
    })

    test("shows the human employee LLMCO_CURRENT_HUMAN_ID names, and the committer", () => {
        const currentHuman = runCliWithEnv(asJulie, "current-human")

        expect(currentHuman.exitCode).toBe(0)
        expect(currentHuman.stdout).toBe(
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

        const currentHuman = runCliWithEnv(asJulie, "current-human").stdout

        expect(currentHuman).toContain(
            "positions: graphics, support (temporarily)\n",
        )
    })

    test("refuses an id naming no employee", () => {
        const currentHuman = runCliWithEnv(switchedTo("eve"), "current-human")

        expect(currentHuman.exitCode).toBe(1)
        expect(currentHuman.stderr).toContain('names no employee: "eve"')
    })
})
