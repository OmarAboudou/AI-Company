import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

const interimEmployee = ["position", "interim", "employee"]
const interimDirectors = ["position", "interim", "directors"]

function getPositionStatePath(id: string): string {
    return getProjectPath(".llmco", ".state", "positions", `${id}.json`)
}

async function loadPositionStateFile(id: string): Promise<unknown> {
    const file = Bun.file(getPositionStatePath(id))
    return (await file.exists()) ? file.json() : undefined
}

describe("llmco position assign-temporarily and unassign-temporarily", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("position", "create", "developer", "-t", "Developer")
        runCli("position", "create", "designer", "-t", "Designer")
        runCli("employee", "create", "human", "omar", "-n", "Omar")
        runCli("employee", "create", "human", "julie", "-n", "Julie")
        runCli("employee", "create", "human", "bob", "-n", "Bob")
        runCli("position", "assign", "developer", "omar")
    })

    test("unassign-temporarily gives the position back to its default employee", async () => {
        runCli(...interimEmployee, "developer", "julie")

        const end = runCli("position", "unassign-temporarily", "developer")

        expect(end.exitCode).toBe(0)
        expect(end.stdout).toBe(
            'Position "developer" is no longer assigned temporarily to "julie": its default employee "omar" works it again.\n',
        )
        expect(await loadPositionStateFile("developer")).toBeUndefined()
    })

    test("unassign-temporarily leaves a vacant position vacant again", () => {
        runCli(...interimDirectors, "designer")

        const end = runCli("position", "unassign-temporarily", "designer")

        expect(end.stdout).toBe(
            'Position "designer" is no longer assigned temporarily to the directors: it is vacant again.\n',
        )
    })

    test("unassign-temporarily says so when the position isn't assigned temporarily", () => {
        const end = runCli("position", "unassign-temporarily", "developer")

        expect(end.exitCode).toBe(0)
        expect(end.stdout).toBe(
            'Position "developer" isn\'t assigned temporarily.\n',
        )
    })
})
