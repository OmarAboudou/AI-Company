import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { loadPosition } from "../position/storage.ts"
import { createCompany } from "./create-company.ts"
import { loadCompany } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
    Bun.spawnSync(["git", "init", "-q"], { cwd: projectRoot })
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const acme = { name: "Acme", description: "We build things." }

describe("createCompany", () => {
    test("saves the company, naming its director's position", async () => {
        const created = await createCompany(projectRoot, acme)

        const company = await loadCompany(projectRoot)
        expect(company).toEqual({ ...acme, directorPositionId: "director" })
        expect(created).toEqual(company)
    })

    test("creates the director's position, held by no employee", async () => {
        const before = Date.now()
        await createCompany(projectRoot, acme)
        const after = Date.now()

        const position = await loadPosition(projectRoot, "director")
        const createdTime = Date.parse(position.createdAt ?? "")
        expect(position).toMatchObject({ title: "Director", description: "" })
        expect(position.defaultEmployeeId).toBeUndefined()
        expect(createdTime).toBeGreaterThanOrEqual(before)
        expect(createdTime).toBeLessThanOrEqual(after)
    })

    test("refuses to overwrite an existing company", async () => {
        await createCompany(projectRoot, acme)

        const creation = createCompany(projectRoot, { ...acme, name: "Other" })

        await expect(creation).rejects.toThrow(UserError)
        await expect(creation).rejects.toThrow("A company already exists")
        expect((await loadCompany(projectRoot)).name).toBe("Acme")
    })

    test("refuses a blank name", async () => {
        const creation = createCompany(projectRoot, { ...acme, name: " " })

        await expect(creation).rejects.toThrow(UserError)
    })

    test("refuses a directory outside any git repository", async () => {
        const elsewhere = await mkdtemp(join(tmpdir(), "llmco-"))

        const creation = createCompany(elsewhere, acme)

        await expect(creation).rejects.toThrow("Run `git init` first.")
        await rm(elsewhere, { recursive: true, force: true })
    })
})
