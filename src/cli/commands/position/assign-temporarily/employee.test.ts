import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../../use-temporary-project.ts"

const { runCli, projectPath } = useTemporaryProject()

const interimEmployee = ["position", "interim", "employee"]
const interimDirectors = ["position", "interim", "directors"]

function positionStatePath(id: string): string {
    return projectPath(".llmco", ".state", "positions", `${id}.json`)
}

async function positionState(id: string): Promise<unknown> {
    const file = Bun.file(positionStatePath(id))
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

    const julie = { kind: "employee", employeeId: "julie" }

    test("assign-temporarily gives the position to an employee and keeps its default employee", async () => {
        const before = await positionState("developer")

        const interim = runCli(
            "position",
            "assign-temporarily",
            "employee",
            "developer",
            "julie",
        )

        expect(before).toBeUndefined()
        expect(interim.exitCode).toBe(0)
        expect(interim.stdout).toBe(
            'Position "developer" is now assigned temporarily to "julie".\n',
        )
        expect(await positionState("developer")).toEqual({
            temporaryAssignment: julie,
        })
        expect(runCli("position", "show", "developer").stdout).toContain(
            "default employee: omar",
        )
    })

    test("assign-temporarily employee requires the employee's id", async () => {
        const interim = runCli(...interimEmployee, "developer")

        expect(interim.exitCode).toBe(1)
        expect(interim.stderr).toContain("missing required argument")
        expect(await positionState("developer")).toBeUndefined()
    })

    test("assign-temporarily refuses to replace a temporary assignment without --replace", async () => {
        runCli(...interimEmployee, "developer", "julie")

        const interim = runCli(...interimEmployee, "developer", "bob")

        expect(interim.exitCode).toBe(1)
        expect(interim.stderr).toContain(
            'already assigned temporarily to "julie". Add --replace',
        )
        expect(await positionState("developer")).toEqual({
            temporaryAssignment: julie,
        })
    })

    test("assign-temporarily accepts the same temporary assignment again", () => {
        runCli(...interimEmployee, "developer", "julie")

        const again = runCli(...interimEmployee, "developer", "julie")

        expect(again.exitCode).toBe(0)
        expect(again.stdout).toContain("already assigned temporarily")
    })

    test("assign-temporarily writes nothing for the default employee", async () => {
        const interim = runCli(...interimEmployee, "developer", "omar")

        expect(interim.exitCode).toBe(0)
        expect(interim.stdout).toBe(
            '"omar" already works position "developer", as its default employee.\n',
        )
        expect(await positionState("developer")).toBeUndefined()
    })

    test("assign-temporarily refuses the default employee while someone else works the position", async () => {
        runCli(...interimEmployee, "developer", "julie")

        const interim = runCli(...interimEmployee, "developer", "omar", "-r")

        expect(interim.exitCode).toBe(1)
        expect(interim.stderr).toContain(
            "`llmco position unassign-temporarily developer`",
        )
        expect(await positionState("developer")).toEqual({
            temporaryAssignment: julie,
        })
    })

    test("assign-temporarily refuses the director's position", async () => {
        const toJulie = runCli(...interimEmployee, "director", "julie")
        const toDirectors = runCli(...interimDirectors, "director")

        expect(toJulie.exitCode).toBe(1)
        expect(toJulie.stderr).toContain("is the director's position")
        expect(toDirectors.exitCode).toBe(1)
        expect(await positionState("director")).toBeUndefined()
    })

    test("assign-temporarily fails for an unknown position or employee", () => {
        const unknownPosition = runCli(...interimEmployee, "tester", "julie")
        const unknownEmployee = runCli(...interimEmployee, "designer", "eve")

        expect(unknownPosition.exitCode).toBe(1)
        expect(unknownPosition.stderr).toContain('No position "tester".')
        expect(unknownEmployee.exitCode).toBe(1)
        expect(unknownEmployee.stderr).toContain('No employee "eve".')
    })
})
