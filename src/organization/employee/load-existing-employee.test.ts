import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { loadExistingEmployee } from "./load-existing-employee.ts"
import { saveEmployee } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("loadExistingEmployee", () => {
    test("loads the employee the id names", async () => {
        const omar = { id: "omar", name: "Omar", kind: "human" } as const
        await saveEmployee(projectRoot, omar)

        const employee = await loadExistingEmployee(projectRoot, "omar")

        expect(employee).toEqual(omar)
    })

    test("refuses an unknown employee, saying how to list them", async () => {
        const refusalMessage = 'No employee "omar". Run `aico employee list`.'

        const loading = loadExistingEmployee(projectRoot, "omar")

        await expect(loading).rejects.toThrow(UserError)
        await expect(loading).rejects.toThrow(refusalMessage)
    })

    test("refuses an id that is not kebab-case", async () => {
        const loading = loadExistingEmployee(projectRoot, "Omar")

        await expect(loading).rejects.toThrow('Invalid employee id "Omar"')
    })
})
