import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createClonedCompany } from "./create-cloned-company.testing.ts"
import { requireCompany } from "./require-company.ts"
import { loadCompany, saveCompany } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "aico-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("requireCompany", () => {
    test("refuses a directory without company, saying how to create one", async () => {
        const checking = requireCompany(projectRoot)

        await expect(checking).rejects.toThrow(UserError)
        await expect(checking).rejects.toThrow("Run `aico init` first.")
    })

    test("accepts a directory with a company", async () => {
        const acme = { name: "Acme", directorPositionId: "director" }
        await saveCompany(projectRoot, acme)

        await expect(requireCompany(projectRoot)).resolves.toBeUndefined()
    })
})

describe("requireCompany in a clone", () => {
    test("opens the company that the branch aico/data of its origin holds", async () => {
        const { parentFolderPath, clonePath } = await createClonedCompany()

        try {
            await requireCompany(clonePath)

            expect((await loadCompany(clonePath)).name).toBe("Acme")
        } finally {
            await rm(parentFolderPath, { recursive: true, force: true })
        }
    })
})
