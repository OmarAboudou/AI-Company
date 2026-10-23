import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.testing.ts"
import { loadPosition, savePosition } from "../position/storage.ts"
import { replaceEmployee } from "./replace-employee.ts"
import { hasEmployee, saveEmployee } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await Promise.all([
        ...["omar", "alice", "bob"].map((id) =>
            saveEmployee(projectRoot, {
                id,
                name: id,
                kind: "llm",
                providerId: "anthropic",
                modelId: "opus",
            }),
        ),
        savePosition(projectRoot, createPosition("dev", "omar")),
        savePosition(projectRoot, createPosition("qa", "omar")),
        savePosition(projectRoot, createPosition("ux", "alice")),
        savePosition(projectRoot, createPosition("support", undefined)),
    ])
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

function createPosition(id: string, employeeId: string | undefined) {
    return { id, title: id, description: "", employeeId }
}

async function loadEmployeeId(positionId: string) {
    const position = await loadPosition(projectRoot, positionId)
    return position.employeeId
}

function replaceOmarByAlice() {
    return replaceEmployee(projectRoot, "omar", "alice")
}

describe("replaceEmployee", () => {
    test("gives the replacement every position the employee holds", async () => {
        const handover = await replaceOmarByAlice()

        expect(await loadEmployeeId("dev")).toBe("alice")
        expect(await loadEmployeeId("qa")).toBe("alice")
        expect(handover.heldPositionIds).toEqual(["dev", "qa"])
    })

    test("keeps both employees and the replacement's own positions", async () => {
        await replaceOmarByAlice()

        expect(await hasEmployee(projectRoot, "omar")).toBe(true)
        expect(await loadEmployeeId("ux")).toBe("alice")
    })

    test("changes nothing for an employee who holds no position", async () => {
        const handover = await replaceEmployee(projectRoot, "bob", "alice")

        expect(handover.heldPositionIds).toEqual([])
        expect(await loadEmployeeId("support")).toBeUndefined()
    })

    test("refuses an employee replacing itself", async () => {
        const replacing = replaceEmployee(projectRoot, "omar", "omar")

        await expect(replacing).rejects.toThrow(UserError)
        await expect(replacing).rejects.toThrow("can't replace itself")
    })

    test("refuses an unknown replacement, changing nothing", async () => {
        const replacing = replaceEmployee(projectRoot, "omar", "eve")

        await expect(replacing).rejects.toThrow('No employee "eve".')
        expect(await loadEmployeeId("dev")).toBe("omar")
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const replacing = replaceEmployee(folderWithoutCompany, "omar", "alice")

        await expect(replacing).rejects.toThrow("Run `aico init` first.")
    })
})
