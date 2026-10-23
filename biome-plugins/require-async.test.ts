import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const biomePath = join(import.meta.dir, "..", "node_modules", ".bin", "biome")
const pluginPath = join(import.meta.dir, "require-async.grit")

let sampleFolderPath: string

beforeAll(async () => {
    sampleFolderPath = await mkdtemp(join(tmpdir(), "aico-lint-"))
    await Bun.write(
        join(sampleFolderPath, "biome.json"),
        JSON.stringify({ plugins: [pluginPath] }),
    )
})

afterAll(async () => {
    await rm(sampleFolderPath, { recursive: true, force: true })
})

async function isReported(code: string): Promise<boolean> {
    await Bun.write(join(sampleFolderPath, "sample.ts"), code)
    const lintProcess = Bun.spawnSync(
        [biomePath, "lint", "--only=plugin", "--reporter=json", "sample.ts"],
        { cwd: sampleFolderPath },
    )
    return JSON.parse(lintProcess.stdout.toString()).diagnostics.length > 0
}

describe("require-async", () => {
    test.each([
        [
            "function declaration",
            "function f(): Promise<void> { return Promise.resolve() }",
        ],
        [
            "generic function",
            "function f<T>(value: T): Promise<T> { return Promise.resolve(value) }",
        ],
        [
            "function expression",
            "const f = function (): Promise<void> { return Promise.resolve() }",
        ],
        ["arrow function", "const f = (): Promise<void> => Promise.resolve()"],
        [
            "class method",
            "class C { private m(): Promise<void> { return Promise.resolve() } }",
        ],
        [
            "object method",
            "const o = { m(): Promise<void> { return Promise.resolve() } }",
        ],
    ])("reports a non-async %s returning a Promise", async (_, code) => {
        expect(await isReported(code)).toBe(true)
    })

    test.each([
        ["an async function", "export async function f(): Promise<void> {}"],
        ["an async arrow function", "const f = async (): Promise<void> => {}"],
        [
            "an async method with modifiers",
            "class C { public static async m(): Promise<void> {} }",
        ],
        [
            "a function returning a non-Promise",
            "function f(): number { return 1 }",
        ],
        [
            "a function returning Promises inside another type",
            "function f(): Array<Promise<void>> { return [] }",
        ],
        [
            "a function without return type annotation (not detectable)",
            "function f() { return Promise.resolve() }",
        ],
    ])("accepts %s", async (_, code) => {
        expect(await isReported(code)).toBe(false)
    })
})
