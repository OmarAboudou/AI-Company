import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const { runCli } = useTemporaryProject()

describe("llmco thread list", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
    })

    function createThread(...args: string[]) {
        return runCli("thread", "create", "-s", "Choice of framework", ...args)
    }

    test("lists the threads with their subject, oldest first", () => {
        runCli("thread", "create", "-s", "Budget")
        createThread()

        const list = runCli("thread", "list").stdout
        const rows = list.trimEnd().split("\n")

        expect(rows).toHaveLength(2)
        expect(rows[0]).toMatch(/-budget +Budget$/)
        expect(rows[1]).toMatch(/-choice-of-framework +Choice of framework$/)
    })

    test("says so when there is no thread", () => {
        const list = runCli("thread", "list")

        expect(list.exitCode).toBe(0)
        expect(list.stdout).toContain("No threads yet.")
    })

    test("shows a renamed position awaited under its new id", () => {
        runCli("position", "create", "qa-tester", "-t", "QA Tester")
        createThread("-b", "@qa-tester Can you check?")
        const before = runCli("thread", "list").stdout

        runCli("position", "update-id", "qa-tester", "tester")
        const after = runCli("thread", "list").stdout

        expect(before).toContain("awaiting @qa-tester")
        expect(after).toContain("awaiting @tester")
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

    test("thread list shows the awaited positions", () => {
        const before = runCli("thread", "list").stdout

        runCli("message", "send", threadId, "-b", "@qa-tester, a test plan?")
        const after = runCli("thread", "list").stdout

        expect(before).not.toContain("awaiting")
        expect(after).toContain("Budget  awaiting @qa-tester\n")
    })
})
