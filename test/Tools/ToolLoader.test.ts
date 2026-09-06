import {test, expect, describe, beforeAll, afterAll} from "bun:test"
import {mkdtemp, mkdir, writeFile, rm} from "node:fs/promises"
import {tmpdir} from "node:os"
import {join} from "node:path"
import {loadTools} from "../../src/Tools/ToolLoader"

// Paths are built from the location of this file, never from the current
// working directory, so `bun test` gives the same result wherever it is run from.
const FIXTURES = join(import.meta.dir, "../fixtures")
const EXAMPLE_COMPANY = join(import.meta.dir, "../../example-company")

describe("loadTools", () => {

    test("loads the tool of the example company", async () => {
        const tools = await loadTools({companyRootDir: EXAMPLE_COMPANY})

        expect(tools).toHaveLength(1)
        expect(tools[0]?.name).toBe("example")
    })

    test("loads tools recursively and ignores what is not a .ts file", async () => {
        const tools = await loadTools({companyRootDir: join(FIXTURES, "recursive-company")})

        // readdir gives no ordering guarantee: sort before comparing.
        const names = tools.map((tool) => tool.name).sort()
        expect(names).toEqual(["deep", "flat"])
    })

    test("returns an empty list when the company has no Tools/ directory", async () => {
        const tools = await loadTools({companyRootDir: join(FIXTURES, "no-tools-company")})

        expect(tools).toEqual([])
    })

    test("rejects when a .ts file does not export a tool as default", async () => {
        const loading = loadTools({companyRootDir: join(FIXTURES, "invalid-export-company")})

        await expect(loading).rejects.toThrow("not-a-tool.ts does not export a valid tool as default")
    })

    test("rejects when the company directory does not exist", async () => {
        const loading = loadTools({companyRootDir: join(FIXTURES, "does-not-exist")})

        await expect(loading).rejects.toThrow("does not exist")
    })

    test("rejects when the company path is a file, not a directory", async () => {
        const loading = loadTools({companyRootDir: import.meta.path})

        await expect(loading).rejects.toThrow("is not a directory")
    })

    describe("with a tool that has a syntax error", () => {
        // This fixture cannot live under test/fixtures: a broken .ts file there
        // would make `tsc --noEmit` fail for the whole project. It is generated
        // in a temporary directory instead, and removed afterwards.
        let companyDir: string

        beforeAll(async () => {
            companyDir = await mkdtemp(join(tmpdir(), "llm-company-broken-tool-"))
            await mkdir(join(companyDir, "Tools"))
            await writeFile(join(companyDir, "Tools", "broken.ts"), 'export default { name: "broken"\n')
        })

        afterAll(async () => {
            await rm(companyDir, {recursive: true, force: true})
        })

        test("rejects instead of silently skipping the tool", async () => {
            const loading = loadTools({companyRootDir: companyDir})

            await expect(loading).rejects.toThrow()
        })
    })
})
