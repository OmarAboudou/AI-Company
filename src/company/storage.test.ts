import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { companyExists, loadCompany, saveCompany } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function writeCompanyFiles(config: unknown, description: string) {
    const dir = join(projectRoot, ".llmco", "company")
    await Bun.write(join(dir, "config.json"), JSON.stringify(config))
    await Bun.write(join(dir, "description.md"), description)
}

describe("loadCompany", () => {
    test("reads config.json and description.md", async () => {
        await writeCompanyFiles({ name: "Acme" }, "We build things.")

        expect(await loadCompany(projectRoot)).toEqual({
            name: "Acme",
            description: "We build things.",
        })
    })

    test("rejects an invalid config.json", async () => {
        await writeCompanyFiles({ name: "" }, "")

        await expect(loadCompany(projectRoot)).rejects.toThrow()
    })

    test("fails when there is no company", async () => {
        await expect(loadCompany(projectRoot)).rejects.toThrow()
    })
})

describe("saveCompany", () => {
    test("writes config.json and description.md", async () => {
        await saveCompany(projectRoot, {
            name: "Acme",
            description: "We build things.",
        })

        const dir = join(projectRoot, ".llmco", "company")
        expect(await Bun.file(join(dir, "config.json")).text()).toBe(
            '{\n    "name": "Acme"\n}\n',
        )
        expect(await Bun.file(join(dir, "description.md")).text()).toBe(
            "We build things.",
        )
    })

    test("writes what loadCompany reads back", async () => {
        const company = { name: "Acme", description: "We build things." }

        await saveCompany(projectRoot, company)

        expect(await loadCompany(projectRoot)).toEqual(company)
    })
})

describe("companyExists", () => {
    test("is false before saving and true after", async () => {
        expect(await companyExists(projectRoot)).toBe(false)

        await saveCompany(projectRoot, { name: "Acme", description: "" })

        expect(await companyExists(projectRoot)).toBe(true)
    })
})
