import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../../use-temporary-project.ts"

const { runCli, getProjectPath } = useTemporaryProject()

const interimEmployee = ["position", "interim", "employee"]

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

    const julieWorker = { kind: "employee", employeeId: "julie" }

    test("assign-temporarily needs employee or directors first", async () => {
        const interim = runCli("position", "interim", "developer", "julie")

        expect(interim.exitCode).toBe(1)
        expect(interim.stderr).toContain("unknown command 'developer'")
        expect(await loadPositionStateFile("developer")).toBeUndefined()
    })

    test("interim and end-interim are aliases", async () => {
        const interim = runCli(...interimEmployee, "developer", "julie")
        const during = await loadPositionStateFile("developer")
        const interimEnd = runCli("position", "end-interim", "developer")

        expect(interim.exitCode).toBe(0)
        expect(during).toEqual({ temporaryAssignment: julieWorker })
        expect(interimEnd.exitCode).toBe(0)
        expect(await loadPositionStateFile("developer")).toBeUndefined()
    })
})
