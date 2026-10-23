import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.testing.ts"
import { loadPosition, savePosition } from "../position/storage.ts"
import { deleteEmployee } from "./delete-employee.ts"
import { hasEmployee, saveEmployee } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await Promise.all([
        saveEmployee(projectRoot, {
            id: "omar",
            name: "Omar",
            kind: "llm",
            providerId: "anthropic",
            modelId: "opus",
        }),
        savePosition(projectRoot, { id: "dev", title: "Dev", description: "" }),
        savePosition(projectRoot, { id: "qa", title: "QA", description: "" }),
    ])
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const forceOptions = { shouldForce: true }

async function giveEmployee(positionId: string, employeeId: string) {
    const position = await loadPosition(projectRoot, positionId)
    await savePosition(projectRoot, { ...position, employeeId })
}

describe("deleteEmployee", () => {
    test("deletes an employee who holds no position", async () => {
        const deletion = await deleteEmployee(projectRoot, "omar")

        expect(await hasEmployee(projectRoot, "omar")).toBe(false)
        expect(deletion.releasedPositionIds).toEqual([])
    })

    test("refuses an employee who holds positions, naming them", async () => {
        await giveEmployee("dev", "omar")
        await giveEmployee("qa", "omar")

        const deletion = deleteEmployee(projectRoot, "omar")

        await expect(deletion).rejects.toThrow(UserError)
        await expect(deletion).rejects.toThrow(
            'Employee "omar" holds dev, qa. Add --force to delete it anyway and give dev, qa back to the directors.',
        )
        expect(await hasEmployee(projectRoot, "omar")).toBe(true)
    })

    test("gives the positions it holds back to the directors when forced", async () => {
        await giveEmployee("dev", "omar")

        const deletion = await deleteEmployee(projectRoot, "omar", forceOptions)

        const position = await loadPosition(projectRoot, "dev")
        expect(position.employeeId).toBeUndefined()
        expect(deletion.releasedPositionIds).toEqual(["dev"])
    })

    test("refuses an unknown employee", async () => {
        const deletion = deleteEmployee(projectRoot, "claude")

        await expect(deletion).rejects.toThrow('No employee "claude".')
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const deletion = deleteEmployee(folderWithoutCompany, "omar")

        await expect(deletion).rejects.toThrow("Run `aico init` first.")
    })
})
