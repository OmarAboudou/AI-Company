import { beforeEach, describe, expect, test } from "bun:test"
import { createCompany } from "../../../../organization/company/create-company.ts"
import { createEmployee } from "../../../../organization/employee/create-employee.ts"
import { assignPosition } from "../../../../organization/position/assign-position.ts"
import { createPosition } from "../../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../../use-temporary-project.testing.ts"

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
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
        await Promise.all([
            createPosition(projectRoot, "developer", {
                title: "Developer",
                description: "",
            }),
            createPosition(projectRoot, "designer", {
                title: "Designer",
                description: "",
            }),
            createEmployee(projectRoot, "omar", {
                name: "Omar",
                kind: "human",
            }),
            createEmployee(projectRoot, "julie", {
                name: "Julie",
                kind: "human",
            }),
            createEmployee(projectRoot, "bob", { name: "Bob", kind: "human" }),
        ])
        await assignPosition(projectRoot, "developer", "omar")
    })

    const julieWorker = { kind: "employee", employeeId: "julie" }

    test("assign-temporarily gives the position to an employee and keeps its default employee", async () => {
        const before = await loadPositionStateFile("developer")

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
        expect(await loadPositionStateFile("developer")).toEqual({
            temporaryAssignment: julieWorker,
        })
        expect(runCli("position", "show", "developer").stdout).toContain(
            "default employee: omar",
        )
    })

    test("assign-temporarily employee requires the employee's id", async () => {
        const interim = runCli(...interimEmployee, "developer")

        expect(interim.exitCode).toBe(1)
        expect(interim.stderr).toContain("missing required argument")
        expect(await loadPositionStateFile("developer")).toBeUndefined()
    })

    test("assign-temporarily refuses to replace a temporary assignment without --replace", async () => {
        runCli(...interimEmployee, "developer", "julie")

        const interim = runCli(...interimEmployee, "developer", "bob")

        expect(interim.exitCode).toBe(1)
        expect(interim.stderr).toContain(
            'already assigned temporarily to "julie". Add --replace',
        )
        expect(await loadPositionStateFile("developer")).toEqual({
            temporaryAssignment: julieWorker,
        })
    })

    test("assign-temporarily accepts the same temporary assignment again", () => {
        runCli(...interimEmployee, "developer", "julie")

        const sameInterim = runCli(...interimEmployee, "developer", "julie")

        expect(sameInterim.exitCode).toBe(0)
        expect(sameInterim.stdout).toContain("already assigned temporarily")
    })

    test("assign-temporarily writes nothing for the default employee", async () => {
        const interim = runCli(...interimEmployee, "developer", "omar")

        expect(interim.exitCode).toBe(0)
        expect(interim.stdout).toBe(
            '"omar" already works position "developer", as its default employee.\n',
        )
        expect(await loadPositionStateFile("developer")).toBeUndefined()
    })
})
