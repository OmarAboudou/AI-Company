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
    test("changes the name and keeps the description", async () => {
        const before = await loadCompany(projectRoot)

        await updateCompany(projectRoot, { name: "Globex" })

        const after = await loadCompany(projectRoot)
        expect(after).toEqual({ ...before, name: "Globex" })
    })

    test("changes the description and keeps the name", async () => {
        const before = await loadCompany(projectRoot)
        const changes = { description: "We build rockets." }

        const updatedCompany = await updateCompany(projectRoot, changes)

        expect(updatedCompany).toEqual({ ...before, ...changes })
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

        await expect(updating).rejects.toThrow("Run `llmco init` first.")
    })
})
