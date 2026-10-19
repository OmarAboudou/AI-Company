import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const { runCli } = useTemporaryProject()

describe("llmco position delete", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("position", "create", "developer", "-t", "Developer")
    })

    test("delete removes the position", () => {
        const deletion = runCli("position", "delete", "developer")

        expect(deletion.exitCode).toBe(0)
        expect(deletion.stdout).toBe('Deleted position "developer".\n')
        expect(runCli("position", "show", "developer").exitCode).toBe(1)
    })

    test("close is an alias of delete", () => {
        expect(runCli("position", "close", "developer").exitCode).toBe(0)
        expect(runCli("position", "show", "developer").exitCode).toBe(1)
    })

    test("delete keeps the default employee hired", () => {
        runCli("employee", "create", "human", "omar", "-n", "Omar")
        runCli("position", "assign", "developer", "omar")

        const deletion = runCli("position", "delete", "developer")
        const show = runCli("employee", "show", "omar")

        expect(deletion.exitCode).toBe(0)
        expect(deletion.stdout).toContain('default employee "omar" stays hired')
        expect(show.stdout).toContain("positions: (none)")
    })

    test("delete refuses a position threads await, listing them", () => {
        const ask = ["-b", "@developer Can you check?"]
        const thread = runCli("thread", "create", "-s", "Release", ...ask)
        const threadId = thread.stdout.trim()

        const deletion = runCli("position", "delete", "developer")

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toContain(`in these threads: ${threadId}.`)
        expect(deletion.stderr).toContain("Add --force")
        expect(runCli("position", "show", "developer").exitCode).toBe(0)
    })

    test.each(["--force", "-f"])(
        "delete %s deletes a position threads await",
        (flag) => {
            const ask = ["-b", "@developer Can you check?"]
            const thread = runCli("thread", "create", "-s", "Release", ...ask)
            const threadId = thread.stdout.trim()

            const deletion = runCli("position", "delete", "developer", flag)
            const list = runCli("thread", "list").stdout

            expect(deletion.stdout).toContain(`Still awaited in: ${threadId}.`)
            expect(runCli("position", "show", "developer").exitCode).toBe(1)
            expect(list).toContain("awaiting @developer")
        },
    )
})

describe("the director's position", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
    })

    test("can't be deleted", () => {
        const deletion = runCli("position", "delete", "director")

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toContain("is the director's position")
        expect(runCli("position", "show", "director").exitCode).toBe(0)
    })
})
