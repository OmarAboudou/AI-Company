import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { loadCompany } from "./storage.ts"

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
