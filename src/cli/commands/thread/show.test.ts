import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const { runCli } = useTemporaryProject()

describe("llmco thread create", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
    })

    function createThread(...args: string[]) {
        return runCli("thread", "create", "-s", "Choice of framework", ...args)
    }

    test("show displays the subject and who created the thread", () => {
        const id = createThread().stdout.trim()

        const show = runCli("thread", "show", id).stdout

        expect(show).toStartWith("# Choice of framework\n\n")
        expect(show).toContain("Created by Test User, Director (@director), ")
    })
})

describe("llmco thread show", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
    })

    function createThread(...args: string[]) {
        return runCli("thread", "create", "-s", "Choice of framework", ...args)
    }

    test("--json prints one message per line, with its author", () => {
        const id = createThread("-b", "Hono or Express?").stdout.trim()
        runCli("message", "send", id, "-b", "Hono, then.")

        const lines = runCli("thread", "show", id, "--json").stdout.split("\n")
        const [first, second] = lines.map((line) => JSON.parse(line || "{}"))

        expect(lines).toHaveLength(3)
        expect(first.body).toBe("Hono or Express?")
        expect(second.body).toBe("Hono, then.")
        expect(second.position).toEqual({ id: "director", title: "Director" })
        expect(second).not.toHaveProperty("employee")
        expect(second.committer).toEqual({
            name: "Test User",
            email: "test@example.com",
        })
    })

    test("fails for an unknown thread", () => {
        const show = runCli("thread", "show", "2026-10-18-nothing")

        expect(show.exitCode).toBe(1)
        expect(show.stderr).toContain('No thread "2026-10-18-nothing".')
    })
})

describe("mentions", () => {
    let threadId = ""

    beforeEach(() => {
        runCli("init", "-n", "Acme")
        threadId = runCli("thread", "create", "-s", "Budget").stdout.trim()
    })

    beforeEach(() => {
        runCli("position", "create", "backend-developer", "-t", "Backend")
        runCli("position", "create", "qa-tester", "-t", "QA Tester")
    })

    test("thread show lists the members and the awaited positions", () => {
        runCli("message", "send", threadId, "-b", "@qa-tester, a test plan?")

        const show = runCli("thread", "show", threadId).stdout

        expect(show).toContain("Members: @director, @qa-tester.\n")
        expect(show).toContain("Awaiting: @qa-tester.\n")
    })
})
