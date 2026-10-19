import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const { runCli, projectPath } = useTemporaryProject()

const interimEmployee = ["position", "interim", "employee"]

function positionStatePath(id: string): string {
    return projectPath(".llmco", ".state", "positions", `${id}.json`)
}

async function positionState(id: string): Promise<unknown> {
    const file = Bun.file(positionStatePath(id))
    return (await file.exists()) ? file.json() : undefined
}

describe("a temporary assignment through the position's lifecycle", () => {
    const julie = {
        temporaryAssignment: { kind: "employee", employeeId: "julie" },
    }

    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("position", "create", "developer", "-t", "Developer")
        runCli("employee", "create", "human", "julie", "-n", "Julie")
        runCli(...interimEmployee, "developer", "julie")
    })

    test("delete removes the state, so a reopened position starts without it", async () => {
        const before = await positionState("developer")

        runCli("position", "delete", "developer")
        const deleted = await positionState("developer")
        runCli("position", "create", "developer", "-t", "Developer")

        expect(before).toEqual(julie)
        expect(deleted).toBeUndefined()
        expect(await positionState("developer")).toBeUndefined()
    })
})

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

    test("delete fails for an unknown position", () => {
        const deletion = runCli("position", "delete", "qa-tester")

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toContain('No position "qa-tester".')
    })
})
