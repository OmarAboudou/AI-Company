import { describe, expect, test } from "bun:test"
import { basename, dirname } from "node:path"
import { Glob } from "bun"
import { builtInTaskTypes } from "./built-in.ts"

describe("builtInTaskTypes", () => {
    test("names each task type after its folder", async () => {
        const paths = await Array.fromAsync(
            new Glob("*/*.ts").scan({ cwd: import.meta.dir }),
        )

        const typeNames = paths
            .filter((path) => basename(path) === `${dirname(path)}.ts`)
            .map((path) => dirname(path))
        expect(Object.keys(builtInTaskTypes).sort()).toEqual(typeNames.sort())
    })
})
