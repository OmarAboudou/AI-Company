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

    test("thread list shows the positions with a pending task there", () => {
        const before = runCli("thread", "list").stdout

        runCli("message", "send", threadId, "-b", "@qa-tester, a test plan?")
        const after = runCli("thread", "list").stdout

        expect(before).not.toContain("pending")
        expect(after).toContain("Budget  tasks pending for @qa-tester\n")
    })
})
