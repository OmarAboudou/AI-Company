import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { requireCompany } from "./require-company.ts"
import { saveCompany } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
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
        await saveCompany(projectRoot, { ...acme, description: "" })

        await expect(requireCompany(projectRoot)).resolves.toBeUndefined()
    })
})
