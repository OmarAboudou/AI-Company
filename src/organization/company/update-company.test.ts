import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "./create-temporary-company.testing.ts"
import { loadCompany } from "./storage.ts"
import { updateCompany } from "./update-company.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("updateCompany", () => {
    test("changes the name", async () => {
        const before = await loadCompany(projectRoot)

        const updatedCompany = await updateCompany(projectRoot, {
            name: "Globex",
        })

        expect(updatedCompany).toEqual({ ...before, name: "Globex" })
        expect(await loadCompany(projectRoot)).toEqual(updatedCompany)
    })

    test("refuses a blank name", async () => {
        const updating = updateCompany(projectRoot, { name: " " })

        await expect(updating).rejects.toThrow(UserError)
        expect((await loadCompany(projectRoot)).name).toBe("Acme")
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const updating = updateCompany(folderWithoutCompany, { name: "Globex" })

        await expect(updating).rejects.toThrow("Run `aico init` first.")
    })
})
