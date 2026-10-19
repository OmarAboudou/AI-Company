import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../use-temporary-project.ts"

const { runCli, runCliWithEnv } = useTemporaryProject()

const interimEmployee = ["position", "interim", "employee"]
const interimDirectors = ["position", "interim", "directors"]

function switchedTo(employeeId: string) {
    return { LLMCO_CURRENT_HUMAN_ID: employeeId }
}

const asJulie = switchedTo("julie")

function hireLlmEmployee(id: string) {
    const connection = ["provider", "connection", "create", "anthropic"]
    const hire = ["employee", "create", "llm", id, "-n", "Claude Senior"]
    runCli("provider", "create", "anthropic", "-n", "Anthropic")
    runCli(...connection, "anthropic-messages", "-u", "https://x.test")
    runCli("model", "create", "anthropic", "opus", "-n", "O", "-a", "o")
    runCli(...hire, "-p", "anthropic", "-m", "opus")
}

beforeEach(() => {
    runCli("init", "-n", "Acme")
    runCli("employee", "create", "human", "julie", "-n", "Julie")
    runCli("employee", "create", "human", "bob", "-n", "Bob")
    for (const id of ["graphics", "support", "design", "sales"]) {
        runCli("position", "create", id, "-t", id)
    }
})

describe("llmco whoami", () => {
    test("without LLMCO_CURRENT_HUMAN_ID, shows a director, named by git", () => {
        const whoami = runCli("whoami")

        expect(whoami.exitCode).toBe(0)
        expect(whoami.stdout).toBe(
            "Test User, a director\n" +
                "positions: director\n" +
                "committer: Test User <test@example.com>\n",
        )
    })

    test("an empty LLMCO_CURRENT_HUMAN_ID means a director too", () => {
        const whoami = runCliWithEnv(switchedTo(""), "whoami")

        expect(whoami.stdout).toStartWith("Test User, a director\n")
    })

    test("a director works the positions assigned temporarily to the directors", () => {
        runCli(...interimDirectors, "support")

        const whoami = runCli("whoami").stdout

        expect(whoami).toContain("positions: director, support (temporarily)\n")
    })

    test("shows the human employee LLMCO_CURRENT_HUMAN_ID names, and the committer", () => {
        const whoami = runCliWithEnv(asJulie, "whoami")

        expect(whoami.exitCode).toBe(0)
        expect(whoami.stdout).toBe(
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

        const whoami = runCliWithEnv(asJulie, "whoami").stdout

        expect(whoami).toContain("positions: graphics, support (temporarily)\n")
    })

    test("refuses an id naming no employee", () => {
        const whoami = runCliWithEnv(switchedTo("eve"), "whoami")

        expect(whoami.exitCode).toBe(1)
        expect(whoami.stderr).toContain('names no employee: "eve"')
    })

    test("refuses an LLM employee", () => {
        hireLlmEmployee("claude")

        const whoami = runCliWithEnv(switchedTo("claude"), "whoami")

        expect(whoami.exitCode).toBe(1)
        expect(whoami.stderr).toContain('"claude", an LLM employee')
    })

    test("refuses a value that isn't an employee id", () => {
        const whoami = runCliWithEnv(switchedTo("../company"), "whoami")

        expect(whoami.exitCode).toBe(1)
        expect(whoami.stderr).toContain("isn't an employee id")
    })
})
