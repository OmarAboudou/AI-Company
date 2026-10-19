import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import type { Company } from "./schema.ts"
import { hasCompany, loadCompany, saveCompany } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const acme: Company = {
    name: "Acme",
    directorPositionId: "director",
    description: "We build things.",
}

async function writeCompanyFiles(config: unknown, description: string) {
    const dir = join(projectRoot, ".llmco", "company")
    await Bun.write(join(dir, "config.json"), JSON.stringify(config))
    await Bun.write(join(dir, "description.md"), description)
}

describe("loadCompany", () => {
    test("reads config.json and description.md", async () => {
        const config = { name: "Acme", directorPositionId: "director" }
        await writeCompanyFiles(config, "We build things.")

        expect(await loadCompany(projectRoot)).toEqual({
            ...config,
            description: "We build things.",
        })
    })

    test("rejects an invalid config.json", async () => {
        await writeCompanyFiles({ name: "" }, "")

        await expect(loadCompany(projectRoot)).rejects.toThrow(UserError)
    })

    test("fails when there is no company", async () => {
        await expect(loadCompany(projectRoot)).rejects.toThrow(UserError)
    })
})

describe("saveCompany", () => {
    test("writes config.json and description.md", async () => {
        await saveCompany(projectRoot, acme)

        const dir = join(projectRoot, ".llmco", "company")
        expect(await Bun.file(join(dir, "config.json")).text()).toBe(
            '{\n    "name": "Acme",\n    "directorPositionId": "director"\n}\n',
        )
        expect(await Bun.file(join(dir, "description.md")).text()).toBe(
            "We build things.",
        )
    })

    test("writes what loadCompany reads back", async () => {
        await saveCompany(projectRoot, acme)

        expect(await loadCompany(projectRoot)).toEqual(acme)
    })
})

describe("hasCompany", () => {
    test("is false before saving and true after", async () => {
        expect(await hasCompany(projectRoot)).toBe(false)

        await saveCompany(projectRoot, acme)

        expect(await hasCompany(projectRoot)).toBe(true)
    })
})
