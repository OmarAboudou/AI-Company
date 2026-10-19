import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "./create-temporary-company.ts"
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

        const updated = await updateCompany(projectRoot, changes)

        expect(updated).toEqual({ ...before, ...changes })
        expect(await loadCompany(projectRoot)).toEqual(updated)
    })

    test("refuses a blank name", async () => {
        const update = updateCompany(projectRoot, { name: " " })

        await expect(update).rejects.toThrow(UserError)
        expect((await loadCompany(projectRoot)).name).toBe("Acme")
    })

    test("refuses to run outside a company", async () => {
        const elsewhere = join(projectRoot, "elsewhere")

        const update = updateCompany(elsewhere, { name: "Globex" })

        await expect(update).rejects.toThrow("Run `llmco init` first.")
    })
})
