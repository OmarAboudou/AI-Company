import { beforeEach, describe, expect, test } from "bun:test"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico position delete", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
        await createPosition(projectRoot, "developer", {
            title: "Developer",
            description: "",
        })
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

    test("delete refuses a position with pending tasks, listing their threads", () => {
        const ask = ["-b", "@developer Can you check?"]
        const creation = runCli("thread", "create", "-s", "Release", ...ask)
        const threadId = creation.stdout.trim()

        const deletion = runCli("position", "delete", "developer")

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toContain(`in these threads: ${threadId}.`)
        expect(deletion.stderr).toContain("Add --force")
        expect(runCli("position", "show", "developer").exitCode).toBe(0)
    })

    test.each(["--force", "-f"])(
        "delete %s deletes a position with pending tasks",
        (flag) => {
            const ask = ["-b", "@developer Can you check?"]
            const creation = runCli("thread", "create", "-s", "Release", ...ask)
            const threadId = creation.stdout.trim()

            const deletion = runCli("position", "delete", "developer", flag)
            const list = runCli("thread", "list").stdout

            expect(deletion.stdout).toContain(`stay pending in: ${threadId}.`)
            expect(runCli("position", "show", "developer").exitCode).toBe(1)
            expect(list).toContain("tasks pending for @developer")
        },
    )
})
