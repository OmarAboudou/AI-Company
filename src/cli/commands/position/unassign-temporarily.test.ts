import { beforeEach, describe, expect, test } from "bun:test"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createEmployee } from "../../../organization/employee/create-employee.ts"
import { assignPosition } from "../../../organization/position/assign-position.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

const interimEmployee = ["position", "interim", "employee"]
const interimDirectors = ["position", "interim", "directors"]

function getPositionStatePath(id: string): string {
    return getProjectPath(".aico", ".state", "positions", `${id}.json`)
}

async function loadPositionStateFile(id: string): Promise<unknown> {
    const file = Bun.file(getPositionStatePath(id))
    return (await file.exists()) ? file.json() : undefined
}

describe("aico position assign-temporarily and unassign-temporarily", () => {
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
