import { describe, expect, test } from "bun:test"
import { Glob } from "bun"
import { builtInTools } from "./built-in.ts"

describe("builtInTools", () => {
    test("names each tool after its path, its folders joined by _", async () => {
        const toolPaths = await Array.fromAsync(
            new Glob("*/*.ts").scan({ cwd: import.meta.dir }),
        )

        const toolNames = toolPaths
            .filter((path) => !path.endsWith(".test.ts"))
            .map((path) => path.slice(0, -".ts".length).replaceAll("/", "_"))
        expect(Object.keys(builtInTools).sort()).toEqual(toolNames.sort())
    })
})
