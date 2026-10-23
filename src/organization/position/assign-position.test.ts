import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.testing.ts"
import { saveEmployee } from "../employee/storage.ts"
import { assignPosition } from "./assign-position.ts"
import { loadPosition, savePosition } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await Promise.all([
        savePosition(projectRoot, { id: "dev", title: "Dev", description: "" }),
        savePosition(projectRoot, { id: "qa", title: "QA", description: "" }),
        ...["omar", "julie", "bob"].map((id) =>
            saveEmployee(projectRoot, {
                id,
                name: id,
                kind: "llm",
                providerId: "anthropic",
                modelId: "opus",
            }),
        ),
    ])
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function loadEmployeeId(positionId: string) {
    const position = await loadPosition(projectRoot, positionId)
    return position.employeeId
}

describe("assignPosition", () => {
    test("gives the directors' position to an employee", async () => {
        const assignment = await assignPosition(projectRoot, "dev", "omar")

        expect(await loadEmployeeId("dev")).toBe("omar")
        expect(assignment.previousEmployeeId).toBeUndefined()
    })

    test("refuses to replace the employee holding it unless told to", async () => {
        await assignPosition(projectRoot, "dev", "bob")

        const assignment = assignPosition(projectRoot, "dev", "omar")

        await expect(assignment).rejects.toThrow(UserError)
        await expect(assignment).rejects.toThrow(
            '"bob" already holds position "dev".',
        )
        await expect(assignment).rejects.toThrow("Add --replace")
        expect(await loadEmployeeId("dev")).toBe("bob")
    })

    test("replaces the employee holding it when told to", async () => {
        await assignPosition(projectRoot, "dev", "bob")

        const assignment = await assignPosition(projectRoot, "dev", "omar", {
            shouldReplace: true,
        })

        expect(await loadEmployeeId("dev")).toBe("omar")
        expect(assignment.previousEmployeeId).toBe("bob")
    })

    test("changes nothing for the employee holding it", async () => {
        await assignPosition(projectRoot, "dev", "omar")

        const assignment = await assignPosition(projectRoot, "dev", "omar")

        expect(await loadEmployeeId("dev")).toBe("omar")
        expect(assignment.previousEmployeeId).toBe("omar")
    })

    test("lets an employee hold several positions", async () => {
        await assignPosition(projectRoot, "dev", "omar")
        await assignPosition(projectRoot, "qa", "omar")

        expect(await loadEmployeeId("dev")).toBe("omar")
        expect(await loadEmployeeId("qa")).toBe("omar")
    })

    test("refuses the director's position", async () => {
        const assignment = assignPosition(projectRoot, "director", "omar")

        await expect(assignment).rejects.toThrow(UserError)
        await expect(assignment).rejects.toThrow("is the director's position")
        expect(await loadEmployeeId("director")).toBeUndefined()
    })

    test("refuses an unknown position", async () => {
        const assignment = assignPosition(projectRoot, "designer", "omar")

        await expect(assignment).rejects.toThrow('No position "designer".')
    })

    test("refuses an unknown employee", async () => {
        const assignment = assignPosition(projectRoot, "dev", "eve")

        await expect(assignment).rejects.toThrow('No employee "eve".')
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const assignment = assignPosition(folderWithoutCompany, "dev", "omar")

        await expect(assignment).rejects.toThrow("Run `aico init` first.")
    })
})
