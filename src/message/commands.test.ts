import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../cli-test-helpers.ts"

const { runCli, runCliWithStdin, projectPath } = useTemporaryProject()

let threadId = ""

beforeEach(() => {
    runCli("init", "-n", "Acme")
    threadId = runCli("thread", "create", "-s", "Budget").stdout.trim()
})

function bodies(): string[] {
    const lines = runCli("thread", "show", threadId, "--json").stdout
    return lines
        .trimEnd()
        .split("\n")
        .filter((line) => line !== "")
        .map((line) => JSON.parse(line).body)
}

describe("llmco message send", () => {
    test("-b adds a message at the end of the thread", () => {
        runCli("message", "send", threadId, "-b", "First.")

        const send = runCli("message", "send", threadId, "--body", "Second.")

        const sent = /^Sent message "\d{8}-\d{6}-\d{3}-[0-9a-f]{4}" in thread/

        expect(send.stdout).toMatch(sent)
        expect(bodies()).toEqual(["First.", "Second."])
    })

    test("-F reads the body from a file", async () => {
        await Bun.write(projectPath("budget.md"), "# Budget\n\n- API: 50 €\n")

        runCli("message", "send", threadId, "-F", "budget.md")

        expect(bodies()).toEqual(["# Budget\n\n- API: 50 €\n"])
    })

    test("-F - reads the body from stdin", () => {
        runCliWithStdin("From stdin.\n", "message", "send", threadId, "-F", "-")

        expect(bodies()).toEqual(["From stdin.\n"])
    })

    test("requires a body", () => {
        const send = runCli("message", "send", threadId)

        expect(send.exitCode).toBe(1)
        expect(send.stderr).toContain("-b, --body or -F, --body-file")
        expect(bodies()).toEqual([])
    })

    test("refuses an empty body", () => {
        const send = runCli("message", "send", threadId, "-b", "  \n")

        expect(send.exitCode).toBe(1)
        expect(send.stderr).toContain("body is empty")
    })

    test("refuses a body and a body file at once", () => {
        const send = runCli(
            "message",
            "send",
            threadId,
            "-b",
            "Inline.",
            "-F",
            "budget.md",
        )

        expect(send.exitCode).toBe(1)
        expect(send.stderr).toContain("cannot be used with")
    })

    test("fails for an unknown thread", () => {
        const send = runCli("message", "send", "2026-10-18-nothing", "-b", "Hi")

        expect(send.exitCode).toBe(1)
        expect(send.stderr).toContain('No thread "2026-10-18-nothing".')
    })
})

describe("mentions", () => {
    beforeEach(() => {
        runCli("position", "create", "backend-developer", "-t", "Backend")
        runCli("position", "create", "qa-tester", "-t", "QA Tester")
    })

    function mentions(): string[][] {
        const lines = runCli("thread", "show", threadId, "--json").stdout
        return lines
            .trimEnd()
            .split("\n")
            .map((line) => JSON.parse(line).mentions)
    }

    test("a message records the positions it mentions", () => {
        const body = "@backend-developer and @qa-tester, thoughts?"

        runCli("message", "send", threadId, "-b", body)

        expect(mentions()).toEqual([["backend-developer", "qa-tester"]])
    })

    test("a mention of no position is reported and ignored", () => {
        const body = "@qa-testers, a test plan?"

        const send = runCli("message", "send", threadId, "-b", body)

        expect(send.exitCode).toBe(0)
        expect(send.stderr).toContain('"@qa-testers" names no position')
        expect(mentions()).toEqual([[]])
    })

    test("the author's own position isn't mentioned", () => {
        runCli("message", "send", threadId, "-b", "Note to @director: done.")

        expect(mentions()).toEqual([[]])
    })

    test("a mention of a specific employee is refused for now", () => {
        const body = "@backend-developer:claude-senior, a review?"

        const send = runCli("message", "send", threadId, "-b", body)

        expect(send.exitCode).toBe(1)
        expect(send.stderr).toContain("Mentioning a specific employee")
        expect(bodies()).toEqual([])
    })

    test("thread create refuses it before creating the thread", () => {
        const create = runCli(
            "thread",
            "create",
            "-s",
            "Review",
            "-b",
            "@backend-developer:claude-senior?",
        )
        const list = runCli("thread", "list").stdout

        expect(create.exitCode).toBe(1)
        expect(list).not.toContain("Review")
    })
})
