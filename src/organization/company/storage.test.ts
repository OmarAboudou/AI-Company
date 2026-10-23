import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import type { Company } from "./schema.ts"
import { hasCompany, loadCompany, saveCompany } from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "aico-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const acme: Company = { name: "Acme", founderPositionId: "founder" }

function getConfigPath() {
    return join(projectRoot, ".aico", "company", "config.json")
}

describe("loadCompany", () => {
    test("reads config.json", async () => {
        await Bun.write(getConfigPath(), JSON.stringify(acme))

        expect(await loadCompany(projectRoot)).toEqual(acme)
    })

    test("rejects an invalid config.json", async () => {
        await Bun.write(getConfigPath(), JSON.stringify({ name: "" }))

        await expect(loadCompany(projectRoot)).rejects.toThrow(UserError)
    })

    test("fails when there is no company", async () => {
        await expect(loadCompany(projectRoot)).rejects.toThrow(UserError)
    })
})

describe("saveCompany", () => {
    test("writes config.json", async () => {
        await saveCompany(projectRoot, acme)

        const configText = await Bun.file(getConfigPath()).text()
        const expectedConfigText =
            '{\n    "name": "Acme",\n    "founderPositionId": "founder"\n}\n'
        expect(configText).toBe(expectedConfigText)
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
